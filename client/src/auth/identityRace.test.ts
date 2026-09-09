import { describe, expect, it, vi } from "vitest";
import React, { useContext } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { AuthContext } from "./AuthContext";
// Tipin adı `AuthContextValue`; burada 2026-09-09'a kadar var olmayan bir
// ad yazılıydı ve kimse görmedi çünkü `pnpm check` test dosyalarını
// okumuyordu (#243). Tip-only import olduğu için çalışma zamanında
// silinip gidiyordu: testin tip iddiası tamamen kurguydu.
import type { AuthContextValue } from "./types";

// Node ortamında React 19'un render edebilmesi için minimal DOM taklidi
class MockNode {
  nodeType: number;
  nodeName: string;
  tagName: string;
  childNodes: MockNode[] = [];
  parentNode: MockNode | null = null;
  style: Record<string, unknown> = {};
  nodeValue?: string;
  ownerDocument: MockDocument | null = null;

  constructor(nodeType: number, name: string) {
    this.nodeType = nodeType;
    this.nodeName = name;
    this.tagName = name;
  }

  appendChild<T extends MockNode>(child: T): T {
    this.childNodes.push(child);
    child.parentNode = this;
    return child;
  }

  removeChild<T extends MockNode>(child: T): T {
    const idx = this.childNodes.indexOf(child);
    if (idx >= 0) this.childNodes.splice(idx, 1);
    return child;
  }

  insertBefore<T extends MockNode>(child: T, ref: MockNode | null): T {
    const idx = ref ? this.childNodes.indexOf(ref) : -1;
    if (idx >= 0) this.childNodes.splice(idx, 0, child);
    else this.childNodes.push(child);
    child.parentNode = this;
    return child;
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  setAttribute(): void {}
  removeAttribute(): void {}
}

class MockDocument extends MockNode {
  documentElement: MockNode;
  body: MockNode;
  defaultView: unknown;

  constructor() {
    super(9, "#document");
    this.documentElement = new MockNode(1, "html");
    this.body = new MockNode(1, "body");
    this.documentElement.appendChild(this.body);
    this.appendChild(this.documentElement);
    this.defaultView = null;
  }

  createElement(tag: string): MockNode {
    const el = new MockNode(1, tag.toLowerCase());
    el.ownerDocument = this;
    return el;
  }

  createTextNode(text: string): MockNode {
    const el = new MockNode(3, "#text");
    el.nodeValue = text;
    el.ownerDocument = this;
    return el;
  }
}

const mockDoc = new MockDocument();
const mockWin = {
  document: mockDoc,
  HTMLIFrameElement: class HTMLIFrameElement {},
  HTMLElement: class HTMLElement {},
  Element: class Element {},
  Node: MockNode,
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  location: { origin: "http://localhost:3000", hash: "" },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
};
mockDoc.defaultView = mockWin;

// Global ortam kurulumu
globalThis.React = React;
// @ts-expect-error test mock globals
globalThis.window = mockWin;
// @ts-expect-error test mock globals
globalThis.document = mockDoc;
// @ts-expect-error test mock globals
globalThis.HTMLIFrameElement = mockWin.HTMLIFrameElement;
// @ts-expect-error test mock globals
globalThis.HTMLElement = mockWin.HTMLElement;
// @ts-expect-error test mock globals
globalThis.Element = mockWin.Element;
// @ts-expect-error test mock globals
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type AuthChangeListener = (event: string, session: Session | null) => void;

let authChangeListener: AuthChangeListener | null = null;
// `<StrictMode>` altında efekt kur-sök-kur çalışır. Sayaçlar temizliğin
// gerçekten koştuğunu ölçmek için: sökülmezse iki canlı dinleyici kalır ve
// her olay iki kez işlenir (#221'in yakınında duran bir hata sınıfı).
let subscribeCount = 0;
let unsubscribeCount = 0;
const fromMock = vi.fn();
const signOutMock = vi.fn(async () => ({ error: null }));
const signInWithPasswordMock = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabaseConfigured: true,
  arrivedWithRecoveryLink: false,
  supabase: {
    from: (table: string) => fromMock(table),
    auth: {
      onAuthStateChange: (cb: AuthChangeListener) => {
        authChangeListener = cb;
        subscribeCount++;
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                unsubscribeCount++;
              },
            },
          },
        };
      },
      signOut: () => signOutMock(),
      signInWithPassword: (...args: unknown[]) =>
        signInWithPasswordMock(...args),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
  },
}));

vi.mock("./runtime", () => ({
  isDemoMode: false,
}));

const { AuthProvider } = await import("./AuthProvider");

type QueryResult = { data: unknown; error: unknown };
function chainReturning(result: QueryResult | Promise<QueryResult>) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "limit", "is"]) {
    chain[method] = () => chain;
  }
  chain.single = () => Promise.resolve(result);
  chain.maybeSingle = () => Promise.resolve(result);
  return chain;
}

const ok = (data: unknown): QueryResult => ({ data, error: null });
const empty: QueryResult = { data: null, error: null };

const testUser = {
  id: "user-race-1",
  email: "pilot@dershane.com",
  user_metadata: { full_name: "Pilot Kullanıcı" },
} as unknown as User;

const testSession: Session = {
  access_token: "jwt-token-1",
  refresh_token: "refresh-1",
  expires_in: 3600,
  token_type: "bearer",
  user: testUser,
};

describe("v1.3-07: Kimlik çözümü sürerken yapılan çıkış (#213)", () => {
  it("Test 1 — kimlik çözümü uçuştayken çıkış yapılırsa bayat sonuç yazılmaz", async () => {
    // Bağlam düz bir `let` yerine NESNE içinde tutuluyor. Sebep TypeScript'in
    // akış analizi: `let x: T | null = null` sonrası atama yalnızca bir geri
    // çağrımda yapılırsa derleyici değişkeni `null`'a daraltır ve okuma
    // yerinde tip `never` olur. Nesne özelliğinin daraltması araya giren
    // fonksiyon çağrılarında (burada `React.act`) düşer, sorun oluşmaz.
    //
    // Bu hiç görünmüyordu çünkü dosyanın tipi zaten kurguydu (#243).
    const seen: { context: AuthContextValue | null } = { context: null };

    function TestConsumer() {
      seen.context = useContext(AuthContext);
      return null;
    }

    let resolveMembershipQuery: (result: QueryResult) => void;
    const delayedMembershipPromise = new Promise<QueryResult>(resolve => {
      resolveMembershipQuery = resolve;
    });

    fromMock.mockImplementation((table: string) => {
      if (table === "organization_memberships") {
        return chainReturning(delayedMembershipPromise);
      }
      if (table === "organizations") {
        return chainReturning(ok({ name: "Pilot Dershane", code: 1042 }));
      }
      if (table === "branches") {
        return chainReturning(ok({ id: "b1", name: "Merkez" }));
      }
      if (table === "profiles") {
        return chainReturning(
          ok({
            display_name: "Pilot Kullanıcı",
            must_change_password: false,
            password_expires_at: null,
            recovery_email: null,
          })
        );
      }
      return chainReturning(empty);
    });

    const rootDiv = mockDoc.createElement("div");
    mockDoc.body.appendChild(rootDiv);
    const root = ReactDOM.createRoot(rootDiv as unknown as HTMLElement);

    await React.act(async () => {
      root.render(
        React.createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          React.createElement(
            AuthProvider,
            null,
            React.createElement(TestConsumer)
          )
        )
      );
    });

    expect(authChangeListener).not.toBeNull();

    // 1. SIGNED_IN olayı gelir -> applyIdentity başlar -> profil/üyelik sorgusu uçuşta
    await React.act(async () => {
      authChangeListener!("SIGNED_IN", testSession);
      // window.setTimeout(..., 0)'ın çalışması için kısa bekleme
      await new Promise(r => setTimeout(r, 10));
    });

    // 2. Kimlik sorgusu henüz tamamlanmadan kullanıcı çıkış yapar
    await React.act(async () => {
      authChangeListener!("SIGNED_OUT", null);
      await new Promise(r => setTimeout(r, 10));
    });

    expect(seen.context?.identity).toBeNull();

    // 3. Uçuştaki sorgu döner
    await React.act(async () => {
      resolveMembershipQuery!({
        data: {
          id: "m-1",
          organization_id: "org-1",
          branch_id: null,
          role: "admin",
        },
        error: null,
      });
      await new Promise(r => setTimeout(r, 20));
    });

    // Kabul kriteri 1: Çıkmış kullanıcının kimliği geri yazılmamalı
    expect(seen.context?.identity).toBeNull();

    // Kabul kriteri 2: resolvedTokenRef yazılmamış olmalı (aynı token tekrar gelirse skip-resolved sayılmamalı)
    // Eğer bayat token yazılmış olsaydı, tekrar giriş 'skip-resolved' ile yutulurdu.
    fromMock.mockImplementation((table: string) => {
      if (table === "organization_memberships") {
        return chainReturning(
          ok({
            id: "m-1",
            organization_id: "org-1",
            branch_id: null,
            role: "admin",
          })
        );
      }
      if (table === "organizations") {
        return chainReturning(ok({ name: "Pilot Dershane", code: 1042 }));
      }
      if (table === "branches") {
        return chainReturning(ok({ id: "b1", name: "Merkez" }));
      }
      if (table === "profiles") {
        return chainReturning(
          ok({
            display_name: "Pilot Kullanıcı",
            must_change_password: false,
            password_expires_at: null,
            recovery_email: null,
          })
        );
      }
      return chainReturning(empty);
    });

    await React.act(async () => {
      authChangeListener!("SIGNED_IN", testSession);
      await new Promise(r => setTimeout(r, 20));
    });

    // Tekrar giriş yapıldığında kimlik başarıyla yüklenmeli
    expect(seen.context?.identity).not.toBeNull();
    expect(seen.context?.identity?.displayName).toBe("Pilot Kullanıcı");
  });

  it("Test 2 — normal yol bozulmadı: araya bir şey girmediğinde kimlik her zamanki gibi yazılır", async () => {
    const seen: { context: AuthContextValue | null } = { context: null };

    function TestConsumer() {
      seen.context = useContext(AuthContext);
      return null;
    }

    fromMock.mockImplementation((table: string) => {
      if (table === "organization_memberships") {
        return chainReturning(
          ok({
            id: "m-2",
            organization_id: "org-1",
            branch_id: null,
            role: "teacher",
          })
        );
      }
      if (table === "organizations") {
        return chainReturning(ok({ name: "Pilot Dershane", code: 1042 }));
      }
      if (table === "branches") {
        return chainReturning(ok({ id: "b1", name: "Merkez" }));
      }
      if (table === "profiles") {
        return chainReturning(
          ok({
            display_name: "Öğretmen Kullanıcı",
            must_change_password: false,
            password_expires_at: null,
            recovery_email: null,
          })
        );
      }
      return chainReturning(empty);
    });

    const rootDiv = mockDoc.createElement("div");
    mockDoc.body.appendChild(rootDiv);
    const root = ReactDOM.createRoot(rootDiv as unknown as HTMLElement);

    await React.act(async () => {
      root.render(
        React.createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          React.createElement(
            AuthProvider,
            null,
            React.createElement(TestConsumer)
          )
        )
      );
    });

    // Normal akış: SIGNED_IN gelir, araya çıkış girmez
    await React.act(async () => {
      authChangeListener!("SIGNED_IN", testSession);
      await new Promise(r => setTimeout(r, 20));
    });

    expect(seen.context?.identity).not.toBeNull();
    expect(seen.context?.identity?.displayName).toBe("Öğretmen Kullanıcı");
    expect(seen.context?.identity?.membership?.role).toBe("teacher");
  });

  it("Test 3 — uçuştaki sorgu hata verse bile bayat hata sonraki oturumu sıfırlamaz", async () => {
    const seen: { context: AuthContextValue | null } = { context: null };

    function TestConsumer() {
      seen.context = useContext(AuthContext);
      return null;
    }

    let rejectFirstQuery: (error: Error) => void;
    const firstPromise = new Promise<QueryResult>((_, reject) => {
      rejectFirstQuery = reject;
    });

    let callCount = 0;
    fromMock.mockImplementation((table: string) => {
      if (table === "organization_memberships") {
        callCount++;
        if (callCount === 1) {
          return chainReturning(firstPromise);
        }
        return chainReturning(
          ok({
            id: "m-new",
            organization_id: "org-1",
            branch_id: null,
            role: "admin",
          })
        );
      }
      if (table === "organizations") {
        return chainReturning(ok({ name: "Pilot Dershane", code: 1042 }));
      }
      if (table === "branches") {
        return chainReturning(ok({ id: "b1", name: "Merkez" }));
      }
      if (table === "profiles") {
        return chainReturning(
          ok({
            display_name: "İkinci Kullanıcı",
            must_change_password: false,
            password_expires_at: null,
            recovery_email: null,
          })
        );
      }
      return chainReturning(empty);
    });

    const rootDiv = mockDoc.createElement("div");
    mockDoc.body.appendChild(rootDiv);
    const root = ReactDOM.createRoot(rootDiv as unknown as HTMLElement);

    await React.act(async () => {
      root.render(
        React.createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          React.createElement(
            AuthProvider,
            null,
            React.createElement(TestConsumer)
          )
        )
      );
    });

    // 1. İlk oturum açma başlar (sorgu uçuşta)
    await React.act(async () => {
      authChangeListener!("SIGNED_IN", testSession);
      await new Promise(r => setTimeout(r, 10));
    });

    // 2. Kullanıcı çıkış yapar
    await React.act(async () => {
      authChangeListener!("SIGNED_OUT", null);
      await new Promise(r => setTimeout(r, 10));
    });

    // 3. Yeni bir oturum başlar
    const secondSession: Session = {
      ...testSession,
      access_token: "jwt-token-2",
      user: {
        ...testUser,
        id: "user-2",
      },
    };

    await React.act(async () => {
      authChangeListener!("SIGNED_IN", secondSession);
      await new Promise(r => setTimeout(r, 10));
    });

    // 4. İlk (bayat) sorgu hata ile sonuçlanır
    await React.act(async () => {
      rejectFirstQuery!(new Error("Ağ koptu"));
      await new Promise(r => setTimeout(r, 20));
    });

    // İkinci oturumun kimliği sağlam durmalı, bayat hata onu sıfırlamamalı
    expect(seen.context?.identity).not.toBeNull();
    expect(seen.context?.identity?.displayName).toBe("İkinci Kullanıcı");
  });

  it("Test 4 — kimlik okuması başarısızken signIn fırlatmalı ve signOut çağrılmalı", async () => {
    const seen: { context: AuthContextValue | null } = { context: null };

    function TestConsumer() {
      seen.context = useContext(AuthContext);
      return null;
    }

    signOutMock.mockClear();
    signInWithPasswordMock.mockImplementation(async () => {
      // Gerçek hayattaki gibi: şifre doğrulanınca önce SIGNED_IN olayı yayılır
      if (authChangeListener) {
        authChangeListener("SIGNED_IN", testSession);
      }
      return {
        data: {
          user: testUser,
          session: testSession,
        },
        error: null,
      };
    });

    let rejectFirstQuery: (error: Error) => void;
    const firstQueryPromise = new Promise<QueryResult>((_, reject) => {
      rejectFirstQuery = reject;
    });

    let queryCallCount = 0;
    // Profil/üyelik sorgusu uçuşta kalsın, araya SIGNED_IN olayı girsin
    fromMock.mockImplementation((table: string) => {
      if (table === "organization_memberships") {
        queryCallCount++;
        if (queryCallCount === 1) {
          return chainReturning(firstQueryPromise);
        }
        return chainReturning(
          ok({
            id: "m-new",
            organization_id: "org-1",
            branch_id: null,
            role: "admin",
          })
        );
      }
      if (table === "platform_operators") {
        return chainReturning(empty);
      }
      if (table === "organizations") {
        return chainReturning(ok({ name: "Pilot Dershane", code: 1042 }));
      }
      if (table === "branches") {
        return chainReturning(ok({ id: "b1", name: "Merkez" }));
      }
      if (table === "profiles") {
        return chainReturning(
          ok({
            display_name: "Pilot",
            must_change_password: false,
            password_expires_at: null,
            recovery_email: null,
          })
        );
      }
      return chainReturning(empty);
    });

    const rootDiv = mockDoc.createElement("div");
    mockDoc.body.appendChild(rootDiv);
    const root = ReactDOM.createRoot(rootDiv as unknown as HTMLElement);

    await React.act(async () => {
      root.render(
        React.createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          React.createElement(
            AuthProvider,
            null,
            React.createElement(TestConsumer)
          )
        )
      );
    });

    // signIn çağrılır ve uçuştayken (query beklerken) setTimeout çalışıp SIGNED_IN applyIdentity'yi başlatır
    let signInPromise: Promise<void>;
    await React.act(async () => {
      signInPromise = seen.context!.signIn({
        email: "pilot@dershane.com",
        password: "password123",
        // Üretim yolunda okunmayan alan: `signIn` bunu yalnız demo modunda
        // kullanıyor ve bu dosyada demo kapalı. Tip zorunlu kıldığı için
        // yazılıyor — demoya özgü bir alanın her girişte zorunlu olması ayrı
        // bir kusur ve PR'da not düşüldü.
        demoRole: "admin",
      });
      // window.setTimeout(..., 0)'ın çalışıp ikinci applyIdentity'yi başlatması için bekleme
      await new Promise(r => setTimeout(r, 10));
    });

    // signIn fırlatmalı — rejection handler'ı unhandled rejection uyarısı vermemesi için
    // sorgu reddedilmeden önce bağlanır
    const signInAssertion = expect(signInPromise!).rejects.toThrow(
      "Veritabanı bağlantı hatası"
    );

    // Şimdi ilk sorgu hata ile döner
    await React.act(async () => {
      rejectFirstQuery!(new Error("Veritabanı bağlantı hatası"));
      await new Promise(r => setTimeout(r, 20));
    });

    await signInAssertion;

    // Ve kullanıcıyı dışarı atmak için signOut çağrılmış olmalı
    expect(signOutMock).toHaveBeenCalled();
  });

  it("Test 5 — oturum kapandığında (SIGNED_OUT) React Query önbelleği temizlenir (#132, v1.3-00)", async () => {
    const seen: { context: AuthContextValue | null } = { context: null };

    function TestConsumer() {
      seen.context = useContext(AuthContext);
      return null;
    }

    const testQueryClient = new QueryClient();

    // 1. Önbelleğe aktif kuruma ait hassas veri koy (ör. denetim kayıtları)
    const queryKey = ["audit", "events", { organizationId: "org-1" }];
    testQueryClient.setQueryData(queryKey, [{ id: 1, action: "test" }]);
    expect(testQueryClient.getQueryData(queryKey)).toBeDefined();

    fromMock.mockImplementation((table: string) => {
      if (table === "organization_memberships") {
        return chainReturning(
          ok({
            id: "m-1",
            organization_id: "org-1",
            branch_id: null,
            role: "admin",
          })
        );
      }
      if (table === "organizations") {
        return chainReturning(ok({ name: "Pilot Dershane", code: 1042 }));
      }
      if (table === "branches") {
        return chainReturning(ok({ id: "b1", name: "Merkez" }));
      }
      if (table === "profiles") {
        return chainReturning(
          ok({
            display_name: "Pilot Kullanıcı",
            must_change_password: false,
            password_expires_at: null,
            recovery_email: null,
          })
        );
      }
      return chainReturning(empty);
    });

    const rootDiv = mockDoc.createElement("div");
    mockDoc.body.appendChild(rootDiv);
    const root = ReactDOM.createRoot(rootDiv as unknown as HTMLElement);

    await React.act(async () => {
      root.render(
        React.createElement(
          QueryClientProvider,
          { client: testQueryClient },
          React.createElement(
            AuthProvider,
            null,
            React.createElement(TestConsumer)
          )
        )
      );
    });

    // Oturum açık başlasın
    await React.act(async () => {
      authChangeListener!("SIGNED_IN", testSession);
      await new Promise(r => setTimeout(r, 20));
    });

    expect(seen.context?.identity).not.toBeNull();
    expect(testQueryClient.getQueryData(queryKey)).toBeDefined();

    // 2. SIGNED_OUT olayı tetiklenir
    await React.act(async () => {
      authChangeListener!("SIGNED_OUT", null);
      await new Promise(r => setTimeout(r, 20));
    });

    // 3. Kimlik null'a çekilmiş olmalı
    expect(seen.context?.identity).toBeNull();

    // 4. Paylaşılan dershane bilgisayarında verinin kalmaması için önbellek tamamen temizlenmiş olmalı (#132)
    expect(testQueryClient.getQueryData(queryKey)).toBeUndefined();
    expect(testQueryClient.getQueryCache().getAll().length).toBe(0);
  });
  // #221 — Bu testin ölçtüğü şey bir sayı: tek girişte kaç kez kimlik okunuyor.
  //
  // Eskiden iki. Sebebi `resolvedTokenRef`'in `await`'ten SONRA yazılmasıydı:
  // `signIn` okumayı başlatıyor, Supabase `SIGNED_IN` yayıyor, olay işlendiğinde
  // okuma daha bitmediği için işaret hâlâ `null` oluyor ve ikinci okuma
  // başlıyordu. `AuthProvider`'ın yorumu 2026-09-09'a kadar bunun olmadığını
  // iddia ediyordu.
  it("Test 6 — tek girişte kimlik YALNIZCA BİR KEZ okunur (#221)", async () => {
    const seen: { context: AuthContextValue | null } = { context: null };

    function TestConsumer() {
      seen.context = useContext(AuthContext);
      return null;
    }

    signInWithPasswordMock.mockImplementation(async () => ({
      data: { user: testUser, session: testSession },
      error: null,
    }));

    let resolveMembershipQuery: (result: QueryResult) => void;
    const delayedMembershipPromise = new Promise<QueryResult>(resolve => {
      resolveMembershipQuery = resolve;
    });

    let membershipCalls = 0;
    fromMock.mockImplementation((table: string) => {
      if (table === "organization_memberships") {
        membershipCalls++;
        return chainReturning(delayedMembershipPromise);
      }
      if (table === "organizations") {
        return chainReturning(ok({ name: "Pilot Dershane", code: 1042 }));
      }
      if (table === "branches") {
        return chainReturning(ok({ id: "b1", name: "Merkez" }));
      }
      if (table === "profiles") {
        return chainReturning(
          ok({
            display_name: "Pilot Kullanıcı",
            must_change_password: false,
            password_expires_at: null,
            recovery_email: null,
          })
        );
      }
      return chainReturning(empty);
    });

    const rootDiv = mockDoc.createElement("div");
    mockDoc.body.appendChild(rootDiv);
    const root = ReactDOM.createRoot(rootDiv as unknown as HTMLElement);

    await React.act(async () => {
      root.render(
        React.createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          React.createElement(
            AuthProvider,
            null,
            React.createElement(TestConsumer)
          )
        )
      );
    });

    // 1. Giriş başlar; üyelik sorgusu uçuşta kalır.
    let signInPromise: Promise<void>;
    await React.act(async () => {
      signInPromise = seen.context!.signIn({
        email: "pilot@dershane.com",
        password: "password123",
        // Üretim yolunda okunmayan alan: `signIn` bunu yalnız demo modunda
        // kullanıyor ve bu dosyada demo kapalı. Tip zorunlu kıldığı için
        // yazılıyor — demoya özgü bir alanın her girişte zorunlu olması ayrı
        // bir kusur ve PR'da not düşüldü.
        demoRole: "admin",
      });
      await new Promise(r => setTimeout(r, 10));
    });

    // 2. Tam bu sırada Supabase SIGNED_IN yayar — gerçek akışın kendisi.
    await React.act(async () => {
      authChangeListener!("SIGNED_IN", testSession);
      await new Promise(r => setTimeout(r, 10));
    });

    // 3. Uçuştaki sorgu şimdi döner.
    await React.act(async () => {
      resolveMembershipQuery!(
        ok({
          id: "m-6",
          organization_id: "org-1",
          branch_id: null,
          role: "teacher",
        })
      );
      await new Promise(r => setTimeout(r, 20));
    });

    await signInPromise!;

    // ⛔ Ölçüm: iki değil bir.
    expect(membershipCalls).toBe(1);

    // Ve dedup kimliği kaybettirmedi — atlanan olay yerine geçmedi, sadece
    // aynı işi tekrarlamadı.
    expect(seen.context?.identity).not.toBeNull();
    expect(seen.context?.identity?.membership?.role).toBe("teacher");
  });
  // v1.3-02 — `<StrictMode>` bu turda açıldı. Açtığı şey burada ölçülüyor:
  // React efekti kurup söküp yeniden kuruyor. Temizlik çalışmazsa iki canlı
  // `onAuthStateChange` dinleyicisi kalır ve her oturum olayı iki kez işlenir.
  //
  // Bu, #221'in bir adım ötesi: orada kimlik iki kez okunuyordu çünkü işaret
  // geç konuyordu; burada iki kez okunma sebebi iki dinleyici olurdu.
  it("Test 7 — <StrictMode> altında abonelik sökülüyor ve kimlik yine çözülüyor", async () => {
    const seen: { context: AuthContextValue | null } = { context: null };

    function TestConsumer() {
      seen.context = useContext(AuthContext);
      return null;
    }

    subscribeCount = 0;
    unsubscribeCount = 0;

    fromMock.mockImplementation((table: string) => {
      if (table === "organization_memberships") {
        return chainReturning(
          ok({
            id: "m-7",
            organization_id: "org-1",
            branch_id: null,
            role: "teacher",
          })
        );
      }
      if (table === "organizations") {
        return chainReturning(ok({ name: "Pilot Dershane", code: 1042 }));
      }
      if (table === "branches") {
        return chainReturning(ok({ id: "b1", name: "Merkez" }));
      }
      if (table === "profiles") {
        return chainReturning(
          ok({
            display_name: "Öğretmen Kullanıcı",
            must_change_password: false,
            password_expires_at: null,
            recovery_email: null,
          })
        );
      }
      return chainReturning(empty);
    });

    const rootDiv = mockDoc.createElement("div");
    mockDoc.body.appendChild(rootDiv);
    const root = ReactDOM.createRoot(rootDiv as unknown as HTMLElement);

    await React.act(async () => {
      root.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(
            QueryClientProvider,
            { client: new QueryClient() },
            React.createElement(
              AuthProvider,
              null,
              React.createElement(TestConsumer)
            )
          )
        )
      );
    });

    // ⛔ Kur-sök-kur: her kurulumun bir sökülmesi olmalı, sonuncusu hariç.
    expect(subscribeCount).toBe(2);
    expect(unsubscribeCount).toBe(1);

    // Ve yeniden kurulan abonelik çalışıyor: olay işleniyor, kimlik yazılıyor.
    await React.act(async () => {
      authChangeListener!("SIGNED_IN", testSession);
      await new Promise(r => setTimeout(r, 20));
    });

    expect(seen.context?.identity).not.toBeNull();
    expect(seen.context?.identity?.membership?.role).toBe("teacher");
  });
});

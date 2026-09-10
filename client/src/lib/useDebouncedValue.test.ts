import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import ReactDOM from "react-dom/client";
import { useDebouncedValue } from "./useDebouncedValue";

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
};
mockDoc.defaultView = mockWin;

const globals = globalThis as unknown as Record<string, unknown>;
globals.IS_REACT_ACT_ENVIRONMENT = true;
globals.React = React;
globals.window = mockWin;
globals.document = mockDoc;
globals.HTMLIFrameElement = mockWin.HTMLIFrameElement;
globals.HTMLElement = mockWin.HTMLElement;
globals.Element = mockWin.Element;

describe("useDebouncedValue (v1.4-01)", () => {
  let rootNode: MockNode;
  let root: ReactDOM.Root;

  beforeEach(() => {
    vi.useFakeTimers();
    rootNode = mockDoc.createElement("div");
    mockDoc.body.appendChild(rootNode);
    root = ReactDOM.createRoot(rootNode as unknown as HTMLElement);
  });

  afterEach(() => {
    React.act(() => {
      root.unmount();
    });
    mockDoc.body.removeChild(rootNode);
    vi.useRealTimers();
  });

  it("başlangıç değerini hemen döner ve gecikme dolunca günceller", () => {
    let currentValue = "";
    function TestConsumer({ value, delay }: { value: string; delay?: number }) {
      currentValue = useDebouncedValue(value, delay);
      return null;
    }

    React.act(() => {
      root.render(
        React.createElement(TestConsumer, { value: "ilk-deger", delay: 300 })
      );
    });
    expect(currentValue).toBe("ilk-deger");

    // Değer güncellenir
    React.act(() => {
      root.render(
        React.createElement(TestConsumer, { value: "yeni-deger", delay: 300 })
      );
    });
    // Henüz 300 ms dolmadı: değer eski kalmalı
    expect(currentValue).toBe("ilk-deger");

    // 200 ms ilerletilir (henüz yetersiz)
    React.act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(currentValue).toBe("ilk-deger");

    // Kalan 100 ms ilerletilir
    React.act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(currentValue).toBe("yeni-deger");
  });

  it("hızlı art arda gelen değişimlerde sayacı sıfırlar (debounce koruması)", () => {
    let currentValue = "";
    function TestConsumer({ value, delay }: { value: string; delay?: number }) {
      currentValue = useDebouncedValue(value, delay);
      return null;
    }

    React.act(() => {
      root.render(
        React.createElement(TestConsumer, { value: "v1", delay: 300 })
      );
    });
    expect(currentValue).toBe("v1");

    React.act(() => {
      root.render(
        React.createElement(TestConsumer, { value: "v2", delay: 300 })
      );
    });
    React.act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(currentValue).toBe("v1");

    React.act(() => {
      root.render(
        React.createElement(TestConsumer, { value: "v3", delay: 300 })
      );
    });
    React.act(() => {
      vi.advanceTimersByTime(150);
    });
    // Toplam 300 ms geçti ancak v3'ten sonra yalnızca 150 ms geçti
    expect(currentValue).toBe("v1");

    React.act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(currentValue).toBe("v3");
  });
});

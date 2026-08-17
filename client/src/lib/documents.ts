import { supabase } from "@/lib/supabaseClient";

export const DOCUMENTS_BUCKET = "workspace-documents";
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export type WorkspaceDocument = {
  id: number;
  name: string;
  category: string;
  description: string | null;
  fileKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  linkedModule: string | null;
  linkedReference: string | null;
  createdAt: string;
};

type WorkspaceDocumentRow = {
  id: number;
  name: string;
  category: string;
  description: string | null;
  file_key: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  linked_module: string | null;
  linked_reference: string | null;
  created_at: string;
};

function fromRow(row: WorkspaceDocumentRow): WorkspaceDocument {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    fileKey: row.file_key,
    url: row.url,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    linkedModule: row.linked_module,
    linkedReference: row.linked_reference,
    createdAt: row.created_at,
  };
}

function safeDocumentName(value: string) {
  return (
    value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "belge"
  );
}

export async function listWorkspaceDocuments(): Promise<WorkspaceDocument[]> {
  const { data, error } = await supabase
    .from("workspace_documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as WorkspaceDocumentRow[]).map(fromRow);
}

export async function uploadWorkspaceDocument(input: {
  file: File;
  category: string;
  description?: string;
  linkedModule?: string;
  linkedReference?: string;
}): Promise<WorkspaceDocument> {
  const { file, category, description, linkedModule, linkedReference } = input;
  if (!file.size || file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("Belge boyutu en fazla 10 MB olabilir.");
  }

  const fileKey = `workspace-documents/${Date.now()}-${safeDocumentName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(fileKey, file, {
      contentType: file.type || "application/octet-stream",
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrlData } = supabase.storage
    .from(DOCUMENTS_BUCKET)
    .getPublicUrl(fileKey);

  const { data, error } = await supabase
    .from("workspace_documents")
    .insert({
      name: file.name,
      category,
      description: description || null,
      file_key: fileKey,
      url: publicUrlData.publicUrl,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      linked_module: linkedModule || null,
      linked_reference: linkedReference || null,
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([fileKey]);
    throw new Error(error.message);
  }
  return fromRow(data as WorkspaceDocumentRow);
}

export async function removeWorkspaceDocument(
  id: number,
  fileKey: string
): Promise<void> {
  const { error } = await supabase
    .from("workspace_documents")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([fileKey]);
}

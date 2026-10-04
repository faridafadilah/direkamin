import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function POST(req) {
  return saveShare(req, crypto.randomUUID());
}

export async function DELETE(req) {
  return saveShare(req, null);
}

async function saveShare(req, token) {
  try {
    const { id } = await req.json();
    if (!id)
      return NextResponse.json(
        { error: "ID kuliah wajib diisi." },
        { status: 400 },
      );
    const { data, error } = await db()
      .from("lectures")
      .update({ share_token: token })
      .eq("id", id)
      .select("share_token")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ token: data.share_token });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

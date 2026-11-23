"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_GRUPO } from "@/lib/contexto";

export async function trocarGrupo(fd: FormData) {
  (await cookies()).set(COOKIE_GRUPO, String(fd.get("grupo")), { path: "/", sameSite: "lax", httpOnly: true });
  revalidatePath("/", "layout");
}

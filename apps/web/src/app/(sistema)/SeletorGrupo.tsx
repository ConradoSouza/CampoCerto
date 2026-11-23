"use client";

export function SeletorGrupo({
  grupos,
  atual,
  acao,
}: {
  grupos: { id: string; nome: string }[];
  atual: string;
  acao: (fd: FormData) => Promise<void>;
}) {
  return (
    <form action={acao}>
      <label>
        Grupo
        <select name="grupo" defaultValue={atual} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>{g.nome}</option>
          ))}
        </select>
      </label>
    </form>
  );
}

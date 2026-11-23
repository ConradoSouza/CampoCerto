import { describe, expect, it } from "vitest";
import { ehAdministradorDoGrupo, pode, type PermissaoEscopo } from "../src";

const fazendaA = { id: "fa", empresa_id: "e1", grupo_id: "g1" };
const fazendaB = { id: "fb", empresa_id: "e1", grupo_id: "g1" };

describe("permissões por escopo", () => {
  it("gerente na A e leitura na B (exemplo da especificação)", () => {
    const p: PermissaoEscopo[] = [
      { perfil: "gerente", escopo: "fazenda", escopo_id: "fa" },
      { perfil: "controladoria", escopo: "fazenda", escopo_id: "fb" },
    ];
    expect(pode(p, fazendaA, "cadastros", "editar")).toBe(true);
    expect(pode(p, fazendaB, "cadastros", "editar")).toBe(false);
    expect(pode(p, fazendaB, "cadastros", "ler")).toBe(true);
  });
  it("escopo de empresa e de grupo cobrem as fazendas abaixo", () => {
    expect(pode([{ perfil: "almoxarife", escopo: "empresa", escopo_id: "e1" }], fazendaB, "estoque", "editar")).toBe(true);
    expect(pode([{ perfil: "administrador", escopo: "grupo", escopo_id: "g1" }], fazendaA, "os", "aprovar")).toBe(true);
    expect(pode([{ perfil: "administrador", escopo: "grupo", escopo_id: "g2" }], fazendaA, "os", "ler")).toBe(false);
  });
  it("operador só aponta as próprias OS e não vê estoque", () => {
    const p: PermissaoEscopo[] = [{ perfil: "operador", escopo: "fazenda", escopo_id: "fa" }];
    expect(pode(p, fazendaA, "os", "proprias")).toBe(true);
    expect(pode(p, fazendaA, "os", "ler")).toBe(false);
    expect(pode(p, fazendaA, "estoque", "ler")).toBe(false);
  });
  it("administrador do grupo", () => {
    expect(ehAdministradorDoGrupo([{ perfil: "administrador", escopo: "grupo", escopo_id: "g1" }], "g1")).toBe(true);
    expect(ehAdministradorDoGrupo([{ perfil: "administrador", escopo: "fazenda", escopo_id: "fa" }], "g1")).toBe(false);
  });
});

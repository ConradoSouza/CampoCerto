import { cores, TOQUE_MINIMO } from "@campocerto/tema";
import { Stack } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

/**
 * Tela inicial do app de campo. Nesta entrega o app é só a base do projeto;
 * login, Minhas OS, apontamento e sincronização offline (PowerSync) chegam na entrega 2.
 */
export default function Inicio() {
  return (
    <ScrollView contentContainerStyle={estilos.tela}>
      <Stack.Screen options={{ title: "Campo Certo" }} />
      <View style={estilos.faixa}>
        <Text style={estilos.titulo}>Bom dia</Text>
        <Text style={estilos.subtitulo}>O app de campo funciona sem sinal e sincroniza quando a internet volta.</Text>
      </View>
      {[
        ["Minhas OS", "Ordens de serviço liberadas para você"],
        ["Apontar", "Registrar o que foi feito no talhão"],
        ["Mapa offline", "Talhões e sua posição sem internet"],
        ["Fila de envio", "O que falta sincronizar"],
      ].map(([titulo, descricao]) => (
        <Pressable key={titulo} style={estilos.botao} disabled accessibilityRole="button" accessibilityState={{ disabled: true }}>
          <Text style={estilos.botaoTitulo}>{titulo}</Text>
          <Text style={estilos.botaoDescricao}>{descricao} · entrega 2</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  tela: { padding: 16, gap: 12 },
  faixa: { backgroundColor: cores.verde, borderRadius: 14, padding: 18, gap: 6 },
  titulo: { color: cores.textoNoVerde, fontSize: 26, fontWeight: "800" },
  subtitulo: { color: "#c6d6c0", fontSize: 16 },
  botao: {
    minHeight: TOQUE_MINIMO + 16,
    backgroundColor: cores.cartao,
    borderColor: cores.linha,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    justifyContent: "center",
    opacity: 0.75,
  },
  botaoTitulo: { fontSize: 19, fontWeight: "700", color: cores.texto },
  botaoDescricao: { fontSize: 15, color: cores.textoSecundario, marginTop: 2 },
});

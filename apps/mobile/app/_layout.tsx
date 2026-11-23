import { cores } from "@campocerto/tema";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: cores.verde },
          headerTintColor: cores.textoNoVerde,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: cores.fundo },
        }}
      />
    </>
  );
}

-- Campo Certo: base do banco.
-- Extensões, schema privado `app`, gerador de UUID v7, tipos e gatilhos comuns.

create extension if not exists postgis with schema extensions;

-- Funções auxiliares ficam fora do schema exposto pela API.
create schema if not exists app;
grant usage on schema app to authenticated, anon, service_role;

-- UUID v7 (ordenado por tempo). O app também gera v7 no aparelho (OF1).
create or replace function public.uuid_v7()
returns uuid
language sql
volatile
set search_path = ''
as $$
  select encode(
    set_bit(
      set_bit(
        overlay(uuid_send(gen_random_uuid())
          placing substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
          from 1 for 6),
        52, 1),
      53, 1),
    'hex')::uuid;
$$;

create type public.perfil as enum (
  'administrador', 'controladoria', 'gerente', 'agronomo', 'encarregado', 'operador', 'almoxarife'
);
create type public.escopo as enum ('grupo', 'empresa', 'fazenda');
create type public.tipo_empresa as enum ('PF', 'PJ', 'condominio');
create type public.posse as enum ('propria', 'arrendada', 'parceria', 'comodato');
create type public.ciclo_safra as enum ('verao', 'segunda_safra', 'inverno', 'perene');
create type public.status_safra as enum ('planejada', 'aberta', 'encerrada');

-- Mantém atualizado_em em toda alteração.
create or replace function app.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- Impede trocar colunas que definem a hierarquia (grupo_id, fazenda_id etc.) depois de criadas.
create or replace function app.colunas_imutaveis()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  coluna text;
  antes jsonb := to_jsonb(old);
  depois jsonb := to_jsonb(new);
begin
  foreach coluna in array tg_argv loop
    if antes -> coluna is distinct from depois -> coluna then
      raise exception 'A coluna % de % não pode ser alterada', coluna, tg_table_name
        using errcode = 'check_violation';
    end if;
  end loop;
  return new;
end;
$$;

#!/usr/bin/env python3
"""Genera supabase/seed.sql desde mock/categorias.json y mock/productos.json.

No se edita supabase/seed.sql a mano en la seccion de catalogo: se regenera
con este script cuando cambien los datos de origen.

Uso:
    python3 mock/generar_seed.py > supabase/seed.sql
"""

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MOCK = RAIZ / "mock"

# Matices por categoria (ver .claude/steering/ui-ux.md): "Bebidas 240,
# Viveres 60, Charcuteria 200, Tortas 40, Higiene y limpieza 175, Snacks 330.
# El resto cae al valor por defecto 265."
MATICES = {
    "viveres": 60,
    "bebidas": 240,
    "charcuteria-y-proteinas": 200,
    "tortas-y-panques": 40,
    "higiene-y-limpieza": 175,
    "snacks": 330,
}
MATIZ_DEFECTO = 265


def sql_str(valor):
    if valor is None:
        return "null"
    return "'" + str(valor).replace("'", "''") + "'"


def sql_num(valor):
    if valor is None:
        return "null"
    return str(valor)


def sql_bool(valor):
    return "true" if valor else "false"


def generar_categorias(categorias):
    filas = []
    for c in categorias:
        matiz = MATICES.get(c["id"], MATIZ_DEFECTO)
        filas.append(
            "  ({id}, {nombre}, {matiz}, {unidad}::unidad_negocio, {orden})".format(
                id=sql_str(c["id"]),
                nombre=sql_str(c["nombre"]),
                matiz=matiz,
                unidad=sql_str(c["unidad_negocio"]),
                orden=c["orden"],
            )
        )
    return (
        "insert into public.categoria (id, nombre, matiz, unidad_negocio, orden) values\n"
        + ",\n".join(filas)
        + "\non conflict (id) do update set\n"
        "  nombre = excluded.nombre,\n"
        "  matiz = excluded.matiz,\n"
        "  unidad_negocio = excluded.unidad_negocio,\n"
        "  orden = excluded.orden;"
    )


def generar_productos(productos):
    filas = []
    for p in productos:
        filas.append(
            "  ({sku}, {nombre}, {categoria}, {unidad_negocio}::unidad_negocio, "
            "{unidad_medida}::unidad_medida, {precio}, {costo}, {stock}, {stock_min}, "
            "{activo}, {origen})".format(
                sku=sql_str(p["sku"]),
                nombre=sql_str(p["nombre"]),
                categoria=sql_str(p["categoria_id"]),
                unidad_negocio=sql_str(p["unidad_negocio"]),
                unidad_medida=sql_str(p["unidad_medida"]),
                precio=sql_num(p["precio_venta_usd"]),
                costo=sql_num(p["costo_usd"]),
                stock=sql_num(p["stock_actual"]),
                stock_min=sql_num(p["stock_minimo"]),
                activo=sql_bool(p["activo"]),
                origen=sql_str(p.get("origen")),
            )
        )
    return (
        "insert into public.producto\n"
        "  (sku, nombre, categoria_id, unidad_negocio, unidad_medida,\n"
        "   precio_venta_usd, costo_usd, stock_actual, stock_minimo, activo, origen)\n"
        "values\n"
        + ",\n".join(filas)
        + "\non conflict (sku) do update set\n"
        "  nombre = excluded.nombre,\n"
        "  categoria_id = excluded.categoria_id,\n"
        "  precio_venta_usd = excluded.precio_venta_usd,\n"
        "  stock_minimo = excluded.stock_minimo,\n"
        "  unidad_medida = excluded.unidad_medida;"
    )


def generar_tasa(tasas):
    t = tasas[0]
    # tasa_cambio es de solo-insercion (ver 0004_tasa.sql): no hay `on
    # conflict` posible. El `where not exists` la hace idempotente sin
    # tocar una tasa real que el dueno ya haya registrado desde la app.
    return (
        "insert into public.tasa_cambio (valor, nota)\n"
        "select {valor}, {nota}\n"
        "where not exists (select 1 from public.tasa_cambio);".format(
            valor=sql_num(t["tasa"]),
            nota=sql_str("seed inicial ({origen})".format(origen=t["origen"])),
        )
    )


def generar_clientes(clientes):
    filas = []
    for c in clientes:
        filas.append(
            "  ({nombre}, {telefono}, {origen})".format(
                nombre=sql_str(c["nombre"]),
                telefono=sql_str(c.get("telefono")),
                origen=sql_str(c["origen"]),
            )
        )
    return (
        "insert into public.cliente (nombre, telefono, origen) values\n"
        + ",\n".join(filas)
        # cliente_origen_uidx es parcial (where origen is not null): el
        # predicado tiene que repetirse aqui para que ON CONFLICT lo infiera.
        + "\non conflict (origen) where origen is not null do update set\n"
        "  nombre = excluded.nombre,\n"
        "  telefono = excluded.telefono;"
    )


def generar_deudas(deudas):
    """`deuda_movimiento` no tiene columna `origen` (no esta en el diseno del
    spec 07): la idempotencia del seed se resuelve buscando la nota exacta
    con `not exists`, mismo patron que el backfill de movimiento_stock en
    0007_inventario.sql."""
    confirmadas = []
    por_revisar = []

    for d in deudas:
        origen = d["origen"]
        negocio = d["unidad_negocio"]

        if d["requiere_revision"]:
            por_revisar.append(
                "insert into public.deuda_por_revisar\n"
                "  (cliente_id, unidad_negocio, nota_original, origen)\n"
                "select (select id from public.cliente where origen = {origen_cli}),\n"
                "  {negocio}::unidad_negocio, {nota}, {origen}\n"
                "on conflict (origen) do nothing;".format(
                    origen_cli=sql_str(_origen_cliente(d["cliente_id"])),
                    negocio=sql_str(negocio),
                    nota=sql_str(d["nota_original"]),
                    origen=sql_str(origen),
                )
            )
        else:
            # VES se convierte a USD con la tasa vigente al aplicar el seed:
            # la planilla no trae una tasa historica por fila.
            monto_usd = (
                "{monto}".format(monto=sql_num(d["monto"]))
                if d["moneda"] == "USD"
                else "round({monto} / public.tasa_vigente(), 2)".format(
                    monto=sql_num(d["monto"])
                )
            )
            nota = "Importado de la planilla ({origen})".format(origen=origen)
            confirmadas.append(
                "insert into public.deuda_movimiento\n"
                "  (cliente_id, unidad_negocio, tipo, monto_usd, tasa_aplicada, nota, usuario_id)\n"
                "select (select id from public.cliente where origen = {origen_cli}),\n"
                "  {negocio}::unidad_negocio, 'deuda', {monto_usd}, public.tasa_vigente(),\n"
                "  {nota}, (select id from public.perfil where rol = 'dueno' order by creado_en limit 1)\n"
                "where public.tasa_vigente() is not null\n"
                "  and exists (select 1 from public.perfil where rol = 'dueno')\n"
                "  and not exists (select 1 from public.deuda_movimiento where nota = {nota});".format(
                    origen_cli=sql_str(_origen_cliente(d["cliente_id"])),
                    negocio=sql_str(negocio),
                    monto_usd=monto_usd,
                    nota=sql_str(nota),
                )
            )

    return "\n\n".join(confirmadas + por_revisar)


def _origen_cliente(cliente_id_mock):
    """mock/deudas.json referencia clientes por el id corto del mock
    (`cli-013`); mock/clientes.json trae el `origen` real (celda del Excel),
    que es la clave que sobrevive el seed (cliente.id es un uuid generado).
    """
    clientes = json.loads((MOCK / "clientes.json").read_text(encoding="utf-8"))
    por_id = {c["id"]: c["origen"] for c in clientes}
    return por_id[cliente_id_mock]


def main():
    categorias = json.loads((MOCK / "categorias.json").read_text(encoding="utf-8"))
    productos = json.loads((MOCK / "productos.json").read_text(encoding="utf-8"))
    tasas = json.loads((MOCK / "tasa-cambio.json").read_text(encoding="utf-8"))
    clientes = json.loads((MOCK / "clientes.json").read_text(encoding="utf-8"))
    deudas = json.loads((MOCK / "deudas.json").read_text(encoding="utf-8"))

    partes = [
        "-- Seed, cargado por `npx supabase db reset` en local, o aplicado a un",
        "-- proyecto remoto con `npx supabase db push` / `db query -f`.",
        "--",
        "-- Este archivo se genera con:",
        "--   python3 mock/generar_seed.py > supabase/seed.sql",
        "-- desde mock/*.json. No se edita a mano.",
        "",
        "-- === 03-catalogo-productos ===",
        "-- {n_cat} categorias, {n_prod} productos (ver mock/README.md).".format(
            n_cat=len(categorias), n_prod=len(productos)
        ),
        "",
        generar_categorias(categorias),
        "",
        generar_productos(productos),
        "",
        "-- === 04-tasa-y-moneda ===",
        "",
        generar_tasa(tasas),
        "",
        "-- === 07-deudas-fiado ===",
        "-- {n_cli} clientes, {n_deu} movimientos de deuda (ver mock/README.md).".format(
            n_cli=len(clientes), n_deu=len(deudas)
        ),
        "-- Requiere que ya exista un dueno y una tasa registrada: en un",
        "-- proyecto nuevo, aplicar despues del primer alta de usuario.",
        "",
        generar_clientes(clientes),
        "",
        generar_deudas(deudas),
        "",
    ]
    print("\n".join(partes))


if __name__ == "__main__":
    main()

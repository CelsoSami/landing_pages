# Databricks notebook source
# MAGIC %md
# MAGIC # Transformação EBA_CSC - Aba Atualizacao
# MAGIC Conversão de Power Query (M) para Python/Pandas

# COMMAND ----------

import pandas as pd
import numpy as np
from datetime import datetime

# COMMAND ----------

CAMINHO_ARQUIVO = (
    "/lakehouse/default/Files/"
    "bronze/rateio_csc_sharepoint_data/"
    "01_FORNECEDORES_RATEIO_CSC/RELATORIO_ANALITICO_CSC_MENSAL_BI/"
    "EBA_CSC_042026.xlsx"
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Funções Auxiliares

# COMMAND ----------

def find_cell(df, texto_busca, case_sensitive=False):
    texto_upper = texto_busca.upper() if not case_sensitive else texto_busca
    for i in range(len(df)):
        for j in range(len(df.columns)):
            valor = df.iat[i, j]
            if pd.notna(valor):
                valor_str = str(valor).strip()
                comparar = valor_str.upper() if not case_sensitive else valor_str
                if comparar == texto_upper:
                    return (i, j)
    return None


def safe_text(valor):
    if pd.isna(valor):
        return ""
    return str(valor).strip()


def safe_number(valor):
    if pd.isna(valor):
        return None
    try:
        return float(valor)
    except (ValueError, TypeError):
        return None


def get_value_after_label(df, label_text):
    pos = find_cell(df, label_text)
    if pos is None:
        return None
    linha, coluna = pos
    row_data = df.iloc[linha, coluna + 1:].values
    for val in row_data:
        if pd.notna(val) and str(val).strip() != "":
            return val
    return None

# COMMAND ----------

# MAGIC %md
# MAGIC ## Leitura da Aba Atualizacao

# COMMAND ----------

fonte_atualizacao = pd.read_excel(
    CAMINHO_ARQUIVO,
    sheet_name="Atualizacao",
    header=None
)

fonte_valor_dolar = pd.read_excel(
    CAMINHO_ARQUIVO,
    sheet_name="$",
    header=None
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## TABELA DE PREÇOS NO PERÍODO - Serviços e Pesos

# COMMAND ----------

pos_tabela_precos = find_cell(fonte_atualizacao, "TABELA DE PREÇOS NO PERIODO")

if pos_tabela_precos is None:
    raise ValueError("Texto 'TABELA DE PREÇOS NO PERIODO' não encontrado na aba Atualizacao")

linha_inicio_servicos = pos_tabela_precos[0] + 4
coluna_servico = pos_tabela_precos[1] + 1
coluna_peso = coluna_servico + 1

servicos = []
for i in range(linha_inicio_servicos, len(fonte_atualizacao)):
    srv_val = fonte_atualizacao.iat[i, coluna_servico]
    if pd.isna(srv_val) or str(srv_val).strip() == "":
        break
    servicos.append({
        "Servico": str(srv_val).strip(),
        "Peso": safe_number(fonte_atualizacao.iat[i, coluna_peso])
    })

tbl_servicos = pd.DataFrame(servicos)

print(f"Serviços encontrados: {len(tbl_servicos)}")
display(tbl_servicos.head(10))

# COMMAND ----------

# MAGIC %md
# MAGIC ## TABELA DINÂMICA - Rótulos de Linha / Centros de Custo

# COMMAND ----------

pos_rotulos = find_cell(fonte_atualizacao, "Rótulos de Linha")

if pos_rotulos is None:
    raise ValueError("Texto 'Rótulos de Linha' não encontrado na aba Atualizacao")

linha_pivot = pos_rotulos[0]
coluna_pivot = pos_rotulos[1]

linha_cabecalho = fonte_atualizacao.iloc[linha_pivot].values
servicos_pivot = linha_cabecalho[coluna_pivot + 1:]

centros_custo = []
for i in range(linha_pivot + 1, len(fonte_atualizacao)):
    cc_val = fonte_atualizacao.iat[i, coluna_pivot]
    if pd.isna(cc_val):
        continue
    if str(cc_val).strip().upper() == "TOTAL GERAL":
        break
    centros_custo.append({
        "CC": str(cc_val).strip(),
        "row_data": fonte_atualizacao.iloc[i].values
    })

print(f"Centros de Custo encontrados: {len(centros_custo)}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Cruzamento Serviço x Centro de Custo

# COMMAND ----------

registros = []

for cc in centros_custo:
    for _, srv in tbl_servicos.iterrows():
        srv_upper = srv["Servico"].strip().upper()

        pos_servico = None
        for idx, sp in enumerate(servicos_pivot):
            sp_text = safe_text(sp).upper()
            if sp_text == srv_upper:
                pos_servico = idx
                break

        quantidade = None
        if pos_servico is not None:
            try:
                quantidade = safe_number(
                    cc["row_data"][coluna_pivot + 1 + pos_servico]
                )
            except (IndexError, KeyError):
                quantidade = None

        registros.append({
            "Aba": "Atualizacao",
            "Servico": srv["Servico"],
            "Peso": srv["Peso"],
            "CentroCusto": cc["CC"],
            "Quantidade": quantidade
        })

tabela_final = pd.DataFrame(registros)

tabela_final["Valor"] = (
    tabela_final["Peso"].fillna(0) * tabela_final["Quantidade"].fillna(0)
)

print(f"Registros gerados: {len(tabela_final)}")
display(tabela_final.head(10))

# COMMAND ----------

# MAGIC %md
# MAGIC ## FORMAÇÃO DE PREÇOS NO PERÍODO

# COMMAND ----------

pos_formacao = find_cell(fonte_atualizacao, "FORMAÇÃO DE PREÇOS NO PERIODO")

if pos_formacao is None:
    raise ValueError("Texto 'FORMAÇÃO DE PREÇOS NO PERIODO' não encontrado")

linha_formacao_servicos = pos_formacao[0] + 4
coluna_formacao_servico = pos_formacao[1] + 1
coluna_formacao_peso = coluna_formacao_servico + 1

formacao_precos = []
for i in range(linha_formacao_servicos, len(fonte_atualizacao)):
    srv_val = fonte_atualizacao.iat[i, coluna_formacao_servico]
    if pd.isna(srv_val) or str(srv_val).strip() == "":
        break
    formacao_precos.append({
        "Servico": str(srv_val).strip().upper(),
        "Peso_Formacao": safe_number(fonte_atualizacao.iat[i, coluna_formacao_peso])
    })

tbl_formacao = pd.DataFrame(formacao_precos)

tabela_final["Servico_Upper"] = tabela_final["Servico"].str.strip().str.upper()

tabela_final = tabela_final.merge(
    tbl_formacao[["Servico", "Peso_Formacao"]],
    left_on="Servico_Upper",
    right_on="Servico",
    how="left",
    suffixes=("", "_formacao")
).drop(columns=["Servico_formacao"], errors="ignore")

print(f"Formação de Preços: {len(tbl_formacao)} serviços")

# COMMAND ----------

# MAGIC %md
# MAGIC ## VOLUMETRIA NO PERÍODO

# COMMAND ----------

pos_volumetria = find_cell(fonte_atualizacao, "VOLUMETRIA NO PERIODO")

if pos_volumetria is None:
    raise ValueError("Texto 'VOLUMETRIA NO PERIODO' não encontrado")

linha_servicos_vol = pos_volumetria[0] - 1
linha_volumetria = pos_volumetria[0]
linha_volumetria_peso = pos_volumetria[0] + 1
coluna_inicio_vol = pos_volumetria[1] + 1

servicos_vol_raw = fonte_atualizacao.iloc[linha_servicos_vol, coluna_inicio_vol:].values
volumetria_raw = fonte_atualizacao.iloc[linha_volumetria, coluna_inicio_vol:].values
volumetria_peso_raw = fonte_atualizacao.iloc[linha_volumetria_peso, coluna_inicio_vol:].values

servicos_vol = []
for idx, srv in enumerate(servicos_vol_raw):
    if pd.isna(srv) or str(srv).strip() == "":
        break
    servicos_vol.append({
        "Servico": str(srv).strip().upper(),
        "Volumetria": safe_number(volumetria_raw[idx]) if idx < len(volumetria_raw) else None,
        "Volumetria_Com_Peso": safe_number(volumetria_peso_raw[idx]) if idx < len(volumetria_peso_raw) else None
    })

tbl_volumetria = pd.DataFrame(servicos_vol)

tabela_final = tabela_final.merge(
    tbl_volumetria[["Servico", "Volumetria", "Volumetria_Com_Peso"]],
    on="Servico",
    how="left"
)

print(f"Volumetria: {len(tbl_volumetria)} serviços")

# COMMAND ----------

# MAGIC %md
# MAGIC ## CUSTO DE ATUALIZAÇÃO (Validação)

# COMMAND ----------

valor_custo_atualizacao = get_value_after_label(fonte_atualizacao, "CUSTO DE ATUALIZAÇÃO:")

soma_valor_calculado = tabela_final["Valor"].sum()

if valor_custo_atualizacao is not None:
    valor_custo_num = safe_number(valor_custo_atualizacao)
    validacao = (
        round(soma_valor_calculado, 2) == round(valor_custo_num, 2)
        if valor_custo_num is not None
        else False
    )
else:
    validacao = False

print(f"Custo de Atualização: {valor_custo_atualizacao}")
print(f"Soma Calculada: {soma_valor_calculado:.2f}")
print(f"Validação: {validacao}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## BASE FINANCEIRA (aba $)

# COMMAND ----------

base_financeira_bruto = get_value_after_label(fonte_valor_dolar, "Base Financeira:")

if base_financeira_bruto is not None:
    try:
        if isinstance(base_financeira_bruto, (datetime, pd.Timestamp)):
            data_base = pd.Timestamp(base_financeira_bruto)
        else:
            data_base = pd.to_datetime(base_financeira_bruto)
        mes_ano_base = data_base.strftime("%m/%Y")
    except Exception:
        data_base = None
        mes_ano_base = None
else:
    data_base = None
    mes_ano_base = None

print(f"Base Financeira: {data_base}")
print(f"Mês/Ano Base: {mes_ano_base}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## BASE OPERACIONAL (aba $)

# COMMAND ----------

base_operacional_bruto = get_value_after_label(fonte_valor_dolar, "Base Operacional:")

if base_operacional_bruto is not None:
    try:
        if isinstance(base_operacional_bruto, (datetime, pd.Timestamp)):
            data_operacional = pd.Timestamp(base_operacional_bruto)
        else:
            data_operacional = pd.to_datetime(base_operacional_bruto)
        mes_ano_operacional = data_operacional.strftime("%m/%Y")
    except Exception:
        data_operacional = None
        mes_ano_operacional = None
else:
    data_operacional = None
    mes_ano_operacional = None

print(f"Base Operacional: {data_operacional}")
print(f"Mês/Ano Operacional: {mes_ano_operacional}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Colunas Finais

# COMMAND ----------

tabela_final["MesAnoOperacional"] = mes_ano_operacional
tabela_final["MesAnoBase"] = mes_ano_base
tabela_final["ValidacaoAtualizacao"] = validacao

tabela_final.drop(columns=["Servico_Upper"], inplace=True, errors="ignore")

tabela_final.sort_values(by="CentroCusto", ascending=True, inplace=True)
tabela_final.reset_index(drop=True, inplace=True)

tabela_final["Peso"] = pd.to_numeric(tabela_final["Peso"], errors="coerce")
tabela_final["Peso_Formacao"] = pd.to_numeric(tabela_final["Peso_Formacao"], errors="coerce")
tabela_final["Quantidade"] = pd.to_numeric(tabela_final["Quantidade"], errors="coerce")
tabela_final["Valor"] = pd.to_numeric(tabela_final["Valor"], errors="coerce")
tabela_final["Volumetria"] = pd.to_numeric(tabela_final["Volumetria"], errors="coerce")
tabela_final["Volumetria_Com_Peso"] = pd.to_numeric(tabela_final["Volumetria_Com_Peso"], errors="coerce")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Resultado Final

# COMMAND ----------

print(f"Total de linhas: {len(tabela_final)}")
print(f"Colunas: {list(tabela_final.columns)}")
display(tabela_final)

# COMMAND ----------

# MAGIC %md
# MAGIC ### Checklist de Validação

# COMMAND ----------

checklist = {
    "TABELA DE PREÇOS NO PERIODO encontrado": pos_tabela_precos is not None,
    "Serviços extraídos": len(tbl_servicos) > 0,
    "Rótulos de Linha encontrado": pos_rotulos is not None,
    "Centros de Custo extraídos": len(centros_custo) > 0,
    "FORMAÇÃO DE PREÇOS NO PERIODO encontrado": pos_formacao is not None,
    "VOLUMETRIA NO PERIODO encontrado": pos_volumetria is not None,
    "CUSTO DE ATUALIZAÇÃO encontrado": valor_custo_atualizacao is not None,
    "Base Financeira encontrada": base_financeira_bruto is not None,
    "Base Operacional encontrada": base_operacional_bruto is not None,
    "Validação Atualização": validacao
}

for item, ok in checklist.items():
    status = "✓" if ok else "✗"
    print(f"  {status} {item}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Exportar (opcional)

# COMMAND ----------

# tabela_final.write.format("delta").mode("overwrite").saveAsTable("tabela_atualizacao")

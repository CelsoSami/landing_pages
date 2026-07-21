# Databricks notebook source
# MAGIC %md
# MAGIC # Transformação EBA_CSC
# MAGIC Conversão de Power Query (M) para Python/Pandas

# COMMAND ----------

# MAGIC %md
# MAGIC ## Imports e Leitura do Arquivo

# COMMAND ----------

import pandas as pd
import numpy as np
from datetime import datetime

# COMMAND ----------

# MAGIC %md
# MAGIC ### Configuração do caminho do arquivo
# MAGIC Ajuste o caminho conforme seu ambiente no Fabric

# COMMAND ----------

# No Fabric, o arquivo deve estar acessível via abfss:// ou montagem
# Exemplo com montagem:
# df_cadastro = pd.read_excel("/mnt/seu_mount/pasta/EBA_CSC_042026.xlsx", sheet_name="Cadastro")
# df_valor_dolar = pd.read_excel("/mnt/seu_mount/pasta/EBA_CSC_042026.xlsx", sheet_name="$")

# Exemplo local (para testes):
CAMINHO_ARQUIVO = r"C:\Users\celso.junior\Downloads\EBA_CSC_042026.xlsx"

# COMMAND ----------

# MAGIC %md
# MAGIC ## Funções Auxiliares

# COMMAND ----------

def find_cell(df, texto_busca, case_sensitive=False):
    """
    Procura uma célula no DataFrame e retorna (linha, coluna) ou None.
    Equivale à lógica de List.PositionOf no M.
    """
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


def find_cell_contains(df, texto_busca, case_sensitive=False):
    """
    Procura célula que CONTÉM o texto (parcial).
    """
    texto_upper = texto_busca.upper() if not case_sensitive else texto_busca
    
    for i in range(len(df)):
        for j in range(len(df.columns)):
            valor = df.iat[i, j]
            if pd.notna(valor):
                valor_str = str(valor).strip()
                comparar = valor_str.upper() if not case_sensitive else valor_str
                if texto_upper in comparar:
                    return (i, j)
    return None


def safe_text(valor):
    """Tenta converter valor para texto, retorna string vazia se falhar."""
    if pd.isna(valor):
        return ""
    return str(valor).strip()


def safe_number(valor):
    """Tenta converter valor para número, retorna None se falhar."""
    if pd.isna(valor):
        return None
    try:
        return float(valor)
    except (ValueError, TypeError):
        return None


def get_value_after_label(df, label_text):
    """
    Encontra um rótulo (ex: 'Base Financeira:') e retorna o primeiro
    valor não vazio à direita na mesma linha.
    """
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
# MAGIC ## Leitura das Abas

# COMMAND ----------

fonte_cadastro = pd.read_excel(
    CAMINHO_ARQUIVO,
    sheet_name="Cadastro",
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

pos_tabela_precos = find_cell(fonte_cadastro, "TABELA DE PREÇOS NO PERIODO")

if pos_tabela_precos is None:
    raise ValueError("Texto 'TABELA DE PREÇOS NO PERIODO' não encontrado na aba Cadastro")

linha_inicio_servicos = pos_tabela_precos[0] + 4
coluna_servico = pos_tabela_precos[1] + 1
coluna_peso = coluna_servico + 1

servicos = []
for i in range(linha_inicio_servicos, len(fonte_cadastro)):
    srv_val = fonte_cadastro.iat[i, coluna_servico]
    if pd.isna(srv_val) or str(srv_val).strip() == "":
        break
    servicos.append({
        "Servico": str(srv_val).strip(),
        "Peso": safe_number(fonte_cadastro.iat[i, coluna_peso])
    })

tbl_servicos = pd.DataFrame(servicos)

print(f"Serviços encontrados: {len(tbl_servicos)}")
tbl_servicos.head(10)

# COMMAND ----------

# MAGIC %md
# MAGIC ## TABELA DINÂMICA - Rótulos de Linha / Centros de Custo

# COMMAND ----------

pos_rotulos = find_cell(fonte_cadastro, "Rótulos de Linha")

if pos_rotulos is None:
    raise ValueError("Texto 'Rótulos de Linha' não encontrado na aba Cadastro")

linha_pivot = pos_rotulos[0]
coluna_pivot = pos_rotulos[1]

# Cabeçalhos (Serviços na pivot)
linha_cabecalho = fonte_cadastro.iloc[linha_pivot].values
servicos_pivot = linha_cabecalho[coluna_pivot + 1:]

# Centros de Custo (linhas abaixo do pivot até "Total Geral")
centros_custo = []
for i in range(linha_pivot + 1, len(fonte_cadastro)):
    cc_val = fonte_cadastro.iat[i, coluna_pivot]
    if pd.isna(cc_val):
        continue
    if str(cc_val).strip().upper() == "TOTAL GERAL":
        break
    centros_custo.append({
        "CC": str(cc_val).strip(),
        "row_data": fonte_cadastro.iloc[i].values
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
        
        # Encontrar posição do serviço nos cabeçalhos da pivot
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
            "Aba": "Cadastro",
            "Servico": srv["Servico"],
            "Peso": srv["Peso"],
            "CentroCusto": cc["CC"],
            "Quantidade": quantidade
        })

tabela_final = pd.DataFrame(registros)

# Calcula Valor = Peso × Quantidade
tabela_final["Valor"] = (
    tabela_final["Peso"].fillna(0) * tabela_final["Quantidade"].fillna(0)
)

print(f"Registros gerados: {len(tabela_final)}")
tabela_final.head(10)

# COMMAND ----------

# MAGIC %md
# MAGIC ## FORMAÇÃO DE PREÇOS NO PERÍODO

# COMMAND ----------

pos_formacao = find_cell(fonte_cadastro, "FORMAÇÃO DE PREÇOS NO PERIODO")

if pos_formacao is None:
    raise ValueError("Texto 'FORMAÇÃO DE PREÇOS NO PERIODO' não encontrado")

linha_formacao_servicos = pos_formacao[0] + 4
coluna_formacao_servico = pos_formacao[1] + 1
coluna_formacao_peso = coluna_formacao_servico + 1

formacao_precos = []
for i in range(linha_formacao_servicos, len(fonte_cadastro)):
    srv_val = fonte_cadastro.iat[i, coluna_formacao_servico]
    if pd.isna(srv_val) or str(srv_val).strip() == "":
        break
    formacao_precos.append({
        "Servico": str(srv_val).strip().upper(),
        "Peso_Formacao": safe_number(fonte_cadastro.iat[i, coluna_formacao_peso])
    })

tbl_formacao = pd.DataFrame(formacao_precos)

# Padroniza Servico para join
tabela_final["Servico_Upper"] = tabela_final["Servico"].str.strip().str.upper()

# Merge com Formação de Preços
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

pos_volumetria = find_cell(fonte_cadastro, "VOLUMETRIA NO PERIODO")

if pos_volumetria is None:
    raise ValueError("Texto 'VOLUMETRIA NO PERIODO' não encontrado")

linha_servicos_vol = pos_volumetria[0] - 1
linha_volumetria = pos_volumetria[0]
linha_volumetria_peso = pos_volumetria[0] + 1
coluna_inicio_vol = pos_volumetria[1] + 1

# Extrai serviços da linha acima de "Volumetria"
servicos_vol_raw = fonte_cadastro.iloc[linha_servicos_vol, coluna_inicio_vol:].values
volumetria_raw = fonte_cadastro.iloc[linha_volumetria, coluna_inicio_vol:].values
volumetria_peso_raw = fonte_cadastro.iloc[linha_volumetria_peso, coluna_inicio_vol:].values

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

# Merge com Volumetria
tabela_final = tabela_final.merge(
    tbl_volumetria[["Servico", "Volumetria", "Volumetria_Com_Peso"]],
    on="Servico",
    how="left"
)

print(f"Volumetria: {len(tbl_volumetria)} serviços")

# COMMAND ----------

# MAGIC %md
# MAGIC ## CUSTO DE CADASTRO (Validação)

# COMMAND ----------

valor_custo_cadastro = get_value_after_label(fonte_cadastro, "CUSTO DE CADASTRO:")

soma_valor_calculado = tabela_final["Valor"].sum()

if valor_custo_cadastro is not None:
    valor_custo_num = safe_number(valor_custo_cadastro)
    validacao = round(soma_valor_calculado, 2) == round(valor_custo_num, 2) if valor_custo_num is not None else False
else:
    validacao = False

print(f"Custo de Cadastro: {valor_custo_cadastro}")
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
tabela_final["ValidacaoCadastro"] = validacao

# Remove coluna auxiliar
tabela_final.drop(columns=["Servico_Upper"], inplace=True, errors="ignore")

# Ordena por CentroCusto
tabela_final.sort_values(by="CentroCusto", ascending=True, inplace=True)
tabela_final.reset_index(drop=True, inplace=True)

# Tipagem
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
    "CUSTO DE CADASTRO encontrado": valor_custo_cadastro is not None,
    "Base Financeira encontrada": base_financeira_bruto is not None,
    "Base Operacional encontrada": base_operacional_bruto is not None,
    "Validação Custo Cadastro": validacao
}

for item, ok in checklist.items():
    status = "✓" if ok else "✗"
    print(f"  {status} {item}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Exportar (opcional)

# COMMAND ----------

# Para salvar no Lakehouse do Fabric:
# tabela_final.write.format("delta").mode("overwrite").saveAsTable("tabela_eba_csc")

# Para salvar como CSV:
# tabela_final.to_csv("/mnt/seu_mount/resultados/tabela_eba_csc.csv", index=False)

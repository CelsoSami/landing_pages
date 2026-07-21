'import pandas as pd
import numpy as np
from datetime import datetime

CAMINHO_ARQUIVO = (
    "/lakehouse/default/Files/bronze/rateio_csc_sharepoint_data/01_FORNECEDORES_RATEIO_CSC/RELATORIO_ANALITICO_CSC_MENSAL_BI/"
    "EBA_CSC_042026.xlsx"
)

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

pos_rotulos = find_cell(fonte_cadastro, "Rótulos de Linha")

if pos_rotulos is None:
    raise ValueError("Texto 'Rótulos de Linha' não encontrado na aba Cadastro")

linha_pivot = pos_rotulos[0]
coluna_pivot = pos_rotulos[1]

linha_cabecalho = fonte_cadastro.iloc[linha_pivot].values
servicos_pivot = linha_cabecalho[coluna_pivot + 1:]

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
            "Aba": "Cadastro",
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
tabela_final.head(10)

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

tabela_final["Servico_Upper"] = tabela_final["Servico"].str.strip().str.upper()

tabela_final = tabela_final.merge(
    tbl_formacao[["Servico", "Peso_Formacao"]],
    left_on="Servico_Upper",
    right_on="Servico",
    how="left",
    suffixes=("", "_formacao")
).drop(columns=["Servico_formacao"], errors="ignore")

print(f"Formação de Preços: {len(tbl_formacao)} serviços")

pos_volumetria = find_cell(fonte_cadastro, "VOLUMETRIA NO PERIODO")

if pos_volumetria is None:
    raise ValueError("Texto 'VOLUMETRIA NO PERIODO' não encontrado")

linha_servicos_vol = pos_volumetria[0] - 1
linha_volumetria = pos_volumetria[0]
linha_volumetria_peso = pos_volumetria[0] + 1
coluna_inicio_vol = pos_volumetria[1] + 1

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

tabela_final = tabela_final.merge(
    tbl_volumetria[["Servico", "Volumetria", "Volumetria_Com_Peso"]],
    on="Servico",
    how="left"
)

print(f"Volumetria: {len(tbl_volumetria)} serviços")

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

tabela_final["MesAnoOperacional"] = mes_ano_operacional
tabela_final["MesAnoBase"] = mes_ano_base
tabela_final["ValidacaoCadastro"] = validacao

tabela_final.drop(columns=["Servico_Upper"], inplace=True, errors="ignore")

tabela_final.sort_values(by="CentroCusto", ascending=True, inplace=True)
tabela_final.reset_index(drop=True, inplace=True)

tabela_final["Peso"] = pd.to_numeric(tabela_final["Peso"], errors="coerce")
tabela_final["Peso_Formacao"] = pd.to_numeric(tabela_final["Peso_Formacao"], errors="coerce")
tabela_final["Quantidade"] = pd.to_numeric(tabela_final["Quantidade"], errors="coerce")
tabela_final["Valor"] = pd.to_numeric(tabela_final["Valor"], errors="coerce")
tabela_final["Volumetria"] = pd.to_numeric(tabela_final["Volumetria"], errors="coerce")
tabela_final["Volumetria_Com_Peso"] = pd.to_numeric(tabela_final["Volumetria_Com_Peso"], errors="coerce")

print(f"Total de linhas: {len(tabela_final)}")
print(f"Colunas: {list(tabela_final.columns)}")
display(tabela_final)

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
    print(f"  {status} {item}")' faça igual em 'let
    // Fonte
    Fonte = Excel.Workbook(
        File.Contents("C:\Users\celso.junior\Downloads\EBA_CSC_042026.xlsx"),
        null,
        true
    ),
    Audiência = Fonte{[Item="Audiência",Kind="Sheet"]}[Data],

    Linhas = Table.ToRows(Audiência),

    //=====================================================
    // TABELA DE PREÇOS NO PERIODO
    //=====================================================

    PosTabelaPrecos =
        List.First(
            List.RemoveNulls(
                List.Transform(
                    {0..List.Count(Linhas)-1},
                    (i) =>
                        let
                            Linha = Linhas{i},
                            Pos =
                                List.PositionOf(
                                    List.Transform(
                                        Linha,
                                        each try Text.Upper(Text.From(_)) otherwise ""
                                    ),
                                    "TABELA DE PREÇOS NO PERIODO"
                                )
                        in
                            if Pos >= 0
                            then [Linha=i, Coluna=Pos]
                            else null
                )
            )
        ),

    LinhaInicioServicos = PosTabelaPrecos[Linha] + 7,
    ColunaServico = PosTabelaPrecos[Coluna] + 1,
    ColunaPeso = ColunaServico + 1,

    ServicosBrutos =
        List.Generate(
            () => LinhaInicioServicos,
            each
                _ < List.Count(Linhas)
                and
                (try Linhas{_}{ColunaServico} otherwise null) <> null
                and
                Text.Trim(
                    try Text.From(Linhas{_}{ColunaServico})
                    otherwise ""
                ) <> "",
            each _ + 1,
            each
            [
                Servico = Text.From(Linhas{_}{ColunaServico}),
                Peso = try Number.From(Linhas{_}{ColunaPeso}) otherwise null
            ]
        ),

    TblServicos =
        Table.FromRecords(ServicosBrutos),

    //=====================================================
    // PIVOT
    //=====================================================

    PosRotulos =
        List.First(
            List.RemoveNulls(
                List.Transform(
                    {0..List.Count(Linhas)-1},
                    (i) =>
                        let
                            Linha = Linhas{i},
                            Pos =
                                List.PositionOf(
                                    List.Transform(
                                        Linha,
                                        each try Text.From(_) otherwise ""
                                    ),
                                    "Rótulos de Linha"
                                )
                        in
                            if Pos >= 0
                            then [Linha=i, Coluna=Pos]
                            else null
                )
            )
        ),

    LinhaPivot = PosRotulos[Linha],
    ColunaPivot = PosRotulos[Coluna],

    LinhaCabecalho = Linhas{LinhaPivot},

    ServicosPivot =
        List.Skip(
            LinhaCabecalho,
            ColunaPivot + 1
        ),

    LinhasCC =
        List.Generate(
            () => LinhaPivot + 1,
            each
                _ < List.Count(Linhas)
                and
                Text.Upper(
                    try Text.From(Linhas{_}{ColunaPivot})
                    otherwise ""
                ) <> "TOTAL GERAL",
            each _ + 1,
            each Linhas{_}
        ),

    CentrosCusto =
        List.Transform(
            LinhasCC,
            each
            [
                CC = try Text.From(_{ColunaPivot}) otherwise null,
                Dados = _
            ]
        ),

    //=====================================================
    // SERVIÇO X CC
    //=====================================================

    Resultado =
        List.Combine(
            List.Transform(
                CentrosCusto,
                (cc) =>
                    List.Transform(
                        Table.ToRecords(TblServicos),
                        (srv) =>
                            let
                                PosServico =
                                    List.PositionOf(
                                        List.Transform(
                                            ServicosPivot,
                                            each try Text.From(_) otherwise ""
                                        ),
                                        srv[Servico]
                                    ),

                                Quantidade =
                                    if PosServico >= 0
                                    then
                                        try cc[Dados]{ColunaPivot + 1 + PosServico}
                                        otherwise null
                                    else
                                        null
                            in
                            [
                                Aba = "Audiência",
                                Servico = srv[Servico],
                                Peso = srv[Peso],
                                CentroCusto = cc[CC],
                                Quantidade = Quantidade
                            ]
                    )
            )
        ),

    TabelaFinal =
        Table.FromRecords(Resultado),

    #"Tipo Alterado" =
        Table.TransformColumnTypes(
            TabelaFinal,
            {
                {"Peso", type number},
                {"Quantidade", type number}
            }
        ),

    TabelaComValor =
        Table.AddColumn(
            #"Tipo Alterado",
            "Valor",
            each [Peso] * [Quantidade],
            type number
        ),

    //=====================================================
    // FORMAÇÃO DE PREÇOS NO PERIODO
    //=====================================================

    PosFormacao =
        List.First(
            List.RemoveNulls(
                List.Transform(
                    {0..List.Count(Linhas)-1},
                    (i) =>
                        let
                            Linha = Linhas{i},
                            Pos =
                                List.PositionOf(
                                    List.Transform(
                                        Linha,
                                        each try Text.Upper(Text.From(_)) otherwise ""
                                    ),
                                    "FORMAÇÃO DE PREÇOS NO PERIODO"
                                )
                        in
                            if Pos >= 0
                            then [Linha=i, Coluna=Pos]
                            else null
                )
            )
        ),

    LinhaFormacaoServico = PosFormacao[Linha] + 4,
    ColunaFormacaoServico = PosFormacao[Coluna] + 1,
    ColunaFormacaoPeso = ColunaFormacaoServico + 1,

    FormacaoLista =
        List.Generate(
            () => LinhaFormacaoServico,
            each
                _ < List.Count(Linhas)
                and
                (try Linhas{_}{ColunaFormacaoServico} otherwise null) <> null
                and
                Text.Trim(
                    try Text.From(Linhas{_}{ColunaFormacaoServico})
                    otherwise ""
                ) <> "",
            each _ + 1,
            each
            [
                Servico =
                    Text.Upper(
                        Text.Trim(
                            Text.From(Linhas{_}{ColunaFormacaoServico})
                        )
                    ),
                Peso_Formacao =
                    try Number.From(
                        Linhas{_}{ColunaFormacaoPeso}
                    )
                    otherwise null
            ]
        ),

    TblFormacao =
        Table.FromRecords(FormacaoLista),

    //=====================================================
    // VOLUMETRIA NO PERIODO
    //=====================================================

    PosVolumetria =
        List.First(
            List.RemoveNulls(
                List.Transform(
                    {0..List.Count(Linhas)-1},
                    (i) =>
                        let
                            Linha = Linhas{i},
                            Pos =
                                List.PositionOf(
                                    List.Transform(
                                        Linha,
                                        each try Text.Upper(Text.From(_)) otherwise ""
                                    ),
                                    "VOLUMETRIA NO PERIODO"
                                )
                        in
                            if Pos >= 0
                            then [Linha=i, Coluna=Pos]
                            else null
                )
            )
        ),

    LinhaServicosVol = PosVolumetria[Linha] - 1,
    LinhaVolumetria = PosVolumetria[Linha],
    LinhaVolumetriaPeso = PosVolumetria[Linha] + 1,
    ColunaInicioVol = PosVolumetria[Coluna] + 1,

    VolumetriaLista =
        List.Generate(
            () => ColunaInicioVol,
            each
                _ < List.Count(Linhas{LinhaServicosVol})
                and
                (try Linhas{LinhaServicosVol}{_} otherwise null) <> null
                and
                Text.Trim(
                    try Text.From(Linhas{LinhaServicosVol}{_})
                    otherwise ""
                ) <> "",
            each _ + 1,
            each
            [
                Servico =
                    Text.Upper(
                        Text.Trim(
                            Text.From(
                                Linhas{LinhaServicosVol}{_}
                            )
                        )
                    ),

                Volumetria =
                    try Number.From(
                        Linhas{LinhaVolumetria}{_}
                    )
                    otherwise null,

                Volumetria_Com_Peso =
                    try Number.From(
                        Linhas{LinhaVolumetriaPeso}{_}
                    )
                    otherwise null
            ]
        ),

    TblVolumetria =
        Table.FromRecords(VolumetriaLista),

    //=====================================================
    // MERGES FINAIS
    //=====================================================

    MergeFormacao =
        Table.NestedJoin(
            TabelaComValor,
            {"Servico"},
            TblFormacao,
            {"Servico"},
            "Formacao",
            JoinKind.LeftOuter
        ),

    ExpandFormacao =
        Table.ExpandTableColumn(
            MergeFormacao,
            "Formacao",
            {"Peso_Formacao"},
            {"Peso_Formacao"}
        ),

    MergeVolumetria =
        Table.NestedJoin(
            ExpandFormacao,
            {"Servico"},
            TblVolumetria,
            {"Servico"},
            "Vol",
            JoinKind.LeftOuter
        ),

    ResultadoFinal =
        Table.ExpandTableColumn(
            MergeVolumetria,
            "Vol",
            {
                "Volumetria",
                "Volumetria_Com_Peso"
            },
            {
                "Volumetria",
                "Volumetria_Com_Peso"
            }
        ),
    #"Linhas Classificadas" = Table.Sort(ResultadoFinal,{{"CentroCusto", Order.Ascending}}),

    // =====================================================
    // CUSTO DE AUDIÊNCIA (aba 'Audiência') - VALIDAÇÃO
    // =====================================================

    // Função: localiza a linha/coluna de um rótulo dentro de "Linhas"
    LocalizarRotulo =
        (rotulo as text) as record =>
            List.First(
                List.RemoveNulls(
                    List.Transform(
                        {0..List.Count(Linhas)-1},
                        (i) =>
                            let
                                Linha = Linhas{i},
                                Pos = List.PositionOf(
                                    List.Transform(
                                        Linha,
                                        each Text.Trim(Text.Upper(try Text.From(_) otherwise ""))
                                    ),
                                    Text.Trim(Text.Upper(rotulo))
                                )
                            in
                                if Pos >= 0
                                then [Linha=i, Coluna=Pos]
                                else null
                    )
                )
            ),

    // Função: dado uma posição [Linha, Coluna], retorna o valor não vazio mais próximo à direita, na mesma linha
    ValorMaisProximo =
        (posicao as record) as any =>
            let
                LinhaCompleta = Linhas{posicao[Linha]},
                ColunasApos = List.Skip(LinhaCompleta, posicao[Coluna] + 1),
                PosValor =
                    List.PositionOf(
                        List.Transform(
                            ColunasApos,
                            each
                                try
                                    (_ <> null and Text.Trim(Text.From(_)) <> "")
                                otherwise
                                    false
                        ),
                        true
                    ),
                ValorBruto = ColunasApos{PosValor}
            in
                try Number.From(ValorBruto) otherwise null,

    // Rótulo 1: Correspondente
    PosCustoDiligencia =
        LocalizarRotulo("CUSTO DE AUDIÊNCIA/DILIGÊNCIA - CORRESPONDENTE:"),
    ValorCustoDiligencia =
        ValorMaisProximo(PosCustoDiligencia),

    // Rótulo 2: CSC Virtual
    PosCustoCSC =
        LocalizarRotulo("CUSTO DE AUDIÊNCIA - CSC (Virtual):"),
    ValorCustoCSC =
        ValorMaisProximo(PosCustoCSC),

    // soma dos dois valores encontrados na planilha
    SomaCustoAudiencia =
        (if ValorCustoDiligencia <> null then ValorCustoDiligencia else 0)
        +
        (if ValorCustoCSC <> null then ValorCustoCSC else 0),

    // soma da coluna "Valor" já calculada na tabela
    SomaValorCalculado = List.Sum(TabelaComValor[Valor]),

    // comparação com arredondamento (evita falso-negativo por imprecisão decimal)
    ValidacaoAudiencia =
        if SomaCustoAudiencia <> null and SomaValorCalculado <> null
        then Number.Round(SomaValorCalculado, 2) = Number.Round(SomaCustoAudiencia, 2)
        else false,

    // =====================================================
    // BASE FINANCEIRA (aba '$')
    // =====================================================

    AbaValorDolar = Fonte{[Item="$",Kind="Sheet"]}[Data],
    LinhasValorDolar = Table.ToRows(AbaValorDolar),

    PosBaseFinanceira =
        List.First(
            List.RemoveNulls(
                List.Transform(
                    {0..List.Count(LinhasValorDolar)-1},
                    (i) =>
                        let
                            Linha = LinhasValorDolar{i},
                            Pos = List.PositionOf(
                                List.Transform(
                                    Linha,
                                    each Text.Trim(try Text.From(_) otherwise "")
                                ),
                                "Base Financeira:"
                            )
                        in
                            if Pos >= 0
                            then [Linha=i, Coluna=Pos]
                            else null
                )
            )
        ),

    LinhaBase = PosBaseFinanceira[Linha],
    ColunaBase = PosBaseFinanceira[Coluna],

    LinhaCompletaBase = LinhasValorDolar{LinhaBase},

    // pega tudo que vem depois da coluna do rótulo, na mesma linha
    ColunasApos = List.Skip(LinhaCompletaBase, ColunaBase + 1),

    // posição do primeiro valor não nulo/vazio
    PosValorBase =
        List.PositionOf(
            List.Transform(
                ColunasApos,
                each
                    try
                        (_ <> null and Text.Trim(Text.From(_)) <> "")
                    otherwise
                        false
            ),
            true
        ),

    ValorBaseBruto = ColunasApos{PosValorBase},

    DataBase =
        if Value.Is(ValorBaseBruto, type date)
            or Value.Is(ValorBaseBruto, type datetime)
            or Value.Is(ValorBaseBruto, type datetimezone)
        then Date.From(ValorBaseBruto)
        else try Date.From(ValorBaseBruto) otherwise null,

    MesAnoBase =
        if DataBase <> null
        then
            Text.PadStart(Text.From(Date.Month(DataBase)), 2, "0")
            & "/" &
            Text.From(Date.Year(DataBase))
        else null,

    // =====================================================
    // BASE OPERACINAL (aba '$')
    // =====================================================

    AbaValorDolar1 = Fonte{[Item="$",Kind="Sheet"]}[Data],
    LinhasValorDolar1 = Table.ToRows(AbaValorDolar1),

    PosBaseFinanceira1 =
        List.First(
            List.RemoveNulls(
                List.Transform(
                    {0..List.Count(LinhasValorDolar1)-1},
                    (i) =>
                        let
                            Linha = LinhasValorDolar1{i},
                            Pos = List.PositionOf(
                                List.Transform(
                                    Linha,
                                    each Text.Trim(try Text.From(_) otherwise "")
                                ),
                                "Base Operacional:"
                            )
                        in
                            if Pos >= 0
                            then [Linha=i, Coluna=Pos]
                            else null
                )
            )
        ),

    LinhaBase1 = PosBaseFinanceira1[Linha],
    ColunaBase1 = PosBaseFinanceira1[Coluna],

    LinhaCompletaBase1 = LinhasValorDolar1{LinhaBase1},

    // pega tudo que vem depois da coluna do rótulo, na mesma linha
    ColunasApos1 = List.Skip(LinhaCompletaBase1, ColunaBase + 1),

    // posição do primeiro valor não nulo/vazio
    PosValorBase1 =
        List.PositionOf(
            List.Transform(
                ColunasApos1,
                each
                    try
                        (_ <> null and Text.Trim(Text.From(_)) <> "")
                    otherwise
                        false
            ),
            true
        ),

    ValorBaseBruto1 = ColunasApos1{PosValorBase1},

    DataBase1 =
        if Value.Is(ValorBaseBruto1, type date)
            or Value.Is(ValorBaseBruto1, type datetime)
            or Value.Is(ValorBaseBruto1, type datetimezone)
        then Date.From(ValorBaseBruto1)
        else try Date.From(ValorBaseBruto1) otherwise null,

    MesAnoBase1 =
        if DataBase1 <> null
        then
            Text.PadStart(Text.From(Date.Month(DataBase1)), 2, "0")
            & "/" &
            Text.From(Date.Year(DataBase1))
        else null,

    // =====================================================
    // ADICIONA A COLUNA NA TABELA FINAL
    // =====================================================

    ComMesAno1 =
        Table.AddColumn(
            #"Linhas Classificadas",
            "MesAnoOperacional",
            each MesAnoBase1,
            type text
        ),

    ComMesAno =
        Table.AddColumn(
            ComMesAno1,
            "MesAnoBase",
            each MesAnoBase,
            type text
        ),

    ComValidacaoAudiencia =
        Table.AddColumn(
            ComMesAno,
            "ValidacaoAudiencia",
            each ValidacaoAudiencia,
            type logical
        ),
    #"Tipo Alterado1" = Table.TransformColumnTypes(ComValidacaoAudiencia,{{"Peso_Formacao", type number}, {"Volumetria", type number}, {"Volumetria_Com_Peso", type number}})

in
    #"Tipo Alterado1"




/*
Checklist para o Usuário

Antes de disponibilizar o arquivo para ingestão, validar:

 - Existe uma aba denominada exatamente 'Audiência'.
 - Existe uma aba denominada exatamente '$'.
 - Existe uma célula contendo exatamente o texto "TABELA DE PREÇOS NO PERIODO".
 - Os serviços iniciam exatamente 7 linhas abaixo e 1 coluna à direita da célula "TABELA DE PREÇOS NO PERIODO".
 - Os pesos estão na coluna imediatamente à direita dos respectivos serviços.
 - Existe uma célula contendo exatamente o texto "Rótulos de Linha".
 - Existe uma célula contendo exatamente o texto "Total Geral", indicando o fim da tabela dinâmica.
 - Os nomes dos serviços da tabela dinâmica são idênticos aos nomes dos serviços da Tabela de Preços no Período.
 - Existe uma célula contendo exatamente o texto "FORMAÇÃO DE PREÇOS NO PERIODO".
 - Os serviços da Formação de Preços iniciam exatamente 4 linhas abaixo e 1 coluna à direita da célula "FORMAÇÃO DE PREÇOS NO PERIODO".
 - Os pesos da Formação de Preços estão na coluna imediatamente à direita dos respectivos serviços.
 - Existe uma célula contendo exatamente o texto "Volumetria no Periodo".
 - A linha imediatamente acima e 1 coluna à direita da célula "Volumetria no Periodo" contém os nomes dos serviços.
 - A linha da célula "Volumetria no Periodo" contém os valores de volumetria.
 - A linha imediatamente abaixo da célula "VOLUMETRIA NO PERIODO" contém os valores de Volumetria com Peso.
 - Existe uma célula contendo exatamente o texto "CUSTO DE AUDIÊNCIA/DILIGÊNCIA - CORRESPONDENTE:".
 - Existe uma célula contendo exatamente o texto "CUSTO DE AUDIÊNCIA - CSC (Virtual):".
 - Os valores dos dois custos (Correspondente e CSC (Virtual)) devem estar na mesma linha do respectivo rótulo, sendo considerado o primeiro valor preenchido à direita de cada um.
 - Existe uma célula contendo exatamente o texto "Base Financeira:" na aba "$", utilizada para retorno da data-base.
*/'

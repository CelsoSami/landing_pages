let
    // Fonte
    Fonte = Excel.Workbook(
        File.Contents("C:\Users\celso.junior\Downloads\EBA_CSC_042026.xlsx"),
        null,
        true
    ),

    Outros = Fonte{[Item="Outros",Kind="Sheet"]}[Data],

    // Converte em lista de listas
    Linhas = Table.ToRows(Outros),

    // =====================================================
    // LOCALIZA "TABELA DE PREÇOS NO PERIODO"
    // =====================================================

    PosTabelaPrecos =
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

    LinhaInicioServicos = PosTabelaPrecos[Linha] + 12,
    ColunaServico = PosTabelaPrecos[Coluna] + 1,
    ColunaPeso = ColunaServico + 1,

    // =====================================================
    // SERVIÇOS E PESOS
    // =====================================================

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

    // =====================================================
    // LOCALIZA PIVOT
    // =====================================================

    PosRotulos =
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

    // =====================================================
    // CABEÇALHOS (SERVIÇOS)
    // =====================================================

    LinhaCabecalho = Linhas{LinhaPivot},

    ServicosPivot =
        List.RemoveFirstN(
            List.Skip(LinhaCabecalho, ColunaPivot + 1),
            0
        ),

    // =====================================================
    // CENTROS DE CUSTO
    // =====================================================

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

    // =====================================================
    // CRUZA SERVIÇO x CC
    // =====================================================

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
                                Aba = "Outros",
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
    #"Tipo Alterado" = Table.TransformColumnTypes(TabelaFinal,{{"Peso", type number}, {"Quantidade", type number}}),
    TabelaComValor =
        Table.AddColumn(
            #"Tipo Alterado",
            "Valor",
            each
                (try Number.From([Peso]) otherwise 0)
                *
                (try Number.From([Quantidade]) otherwise 0),
            type number
        ),

    // =====================================================
    // FORMAÇÃO DE PREÇOS NO PERIODO
    // =====================================================

    PosFormacao =
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

    LinhaFormacaoServicos = PosFormacao[Linha] + 4,
    ColunaFormacaoServico = PosFormacao[Coluna] + 1,
    ColunaFormacaoPeso = ColunaFormacaoServico + 1,

    FormacaoPrecos =
        List.Generate(
            () => LinhaFormacaoServicos,
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
        Table.FromRecords(FormacaoPrecos),


    // =====================================================
    // VOLUMETRIA NO PERIODO
    // =====================================================

    PosVolumetria =
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

    ServicosVol =
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
        Table.FromRecords(ServicosVol),


    // =====================================================
    // ENRIQUECE A TABELA FINAL
    // =====================================================
        
    TabelaComValor_Normalizada =
        Table.TransformColumns(
            TabelaComValor,
            {
                {
                    "Servico",
                    each Text.Trim(
                        Text.Upper(
                            Text.Clean(
                                Text.From(_)
                            )
                        )
                    ),
                    type text
                }
            }
        ),
    TblFormacao_Normalizada =
        Table.TransformColumns(
            TblFormacao,
            {
                {
                    "Servico",
                    each Text.Trim(
                        Text.Upper(
                            Text.Clean(
                                Text.From(_)
                            )
                        )
                    ),
                    type text
                }
            }
        ),
    
    MergeFormacao =
        Table.NestedJoin(
            TabelaComValor_Normalizada,
            {"Servico"},
            TblFormacao_Normalizada,
            {"Servico"},
            "Formacao",
            JoinKind.LeftOuter
        ),




/*
    MergeFormacao =
        Table.NestedJoin(
            TabelaComValor,
            {"Servico"},
            Table.TransformColumns(
                TblFormacao,
                {{"Servico", each Text.Trim(Text.Upper(_)), type text}}
            ),
            {"Servico"},
            "Formacao",
            JoinKind.LeftOuter
        ),*/

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
            Table.TransformColumns(
                TblVolumetria,
                {{"Servico", each Text.Trim(Text.Upper(_)), type text}}
            ),
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
    #"Tipo Alterado1" = Table.TransformColumnTypes(#"Linhas Classificadas",{{"Peso_Formacao", type number}, {"Volumetria", type number}, {"Volumetria_Com_Peso", type number}}),

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

    PosCusto02 =
        LocalizarRotulo("CUSTO DE OUTROS -  Robo - UN02"),
    ValorCusto02 =
        ValorMaisProximo(PosCusto02),

    PosCusto03 =
        LocalizarRotulo("CUSTO DE OUTROS -  Robo - UN03"),
    ValorCusto03 =
        ValorMaisProximo(PosCusto03),

    PosCusto12 =
        LocalizarRotulo("CUSTO DE OUTROS -  Robo - UN12"),
    ValorCusto12 =
        ValorMaisProximo(PosCusto12),

    // soma dos dois valores encontrados na planilha
    SomaCustoAudiencia =
        (if ValorCusto02 <> null then ValorCusto02 else 0)
        +
        (if ValorCusto03 <> null then ValorCusto03 else 0)
        +
        (if ValorCusto12 <> null then ValorCusto12 else 0),

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
    #"Tipo Alterado2" = Table.TransformColumnTypes(ComValidacaoAudiencia,{{"Peso_Formacao", type number}, {"Volumetria", type number}, {"Volumetria_Com_Peso", type number}})

in
    #"Tipo Alterado2"


/*
Checklist para o Usuário

Antes de disponibilizar o arquivo para ingestão, validar:

 - Existe uma aba denominada exatamente Outros.
 - Existe uma aba denominada exatamente $.
 - Existe uma célula contendo exatamente o texto "TABELA DE PREÇOS NO PERIODO".
 - Os serviços iniciam exatamente 12 linhas abaixo e 1 coluna à direita da célula "TABELA DE PREÇOS NO PERIODO".
 - Os pesos estão na coluna imediatamente à direita dos respectivos serviços.
 - Existe uma célula contendo exatamente o texto "Rótulos de Linha".
 - Existe uma célula contendo exatamente o texto "Total Geral", indicando o fim da tabela dinâmica.
 - Os nomes dos serviços da tabela dinâmica são idênticos aos nomes dos serviços da Tabela de Preços no Período.
 - Existe uma célula contendo exatamente o texto "FORMAÇÃO DE PREÇOS NO PERIODO".
 - Os serviços da Formação de Preços iniciam exatamente 4 linhas abaixo e 1 coluna à direita da célula "FORMAÇÃO DE PREÇOS NO PERIODO".
 - Os pesos da Formação de Preços estão na coluna imediatamente à direita dos respectivos serviços.
 - Os nomes dos serviços da Formação de Preços são idênticos aos nomes da Tabela de Preços no Período (desconsiderando diferenças de maiúsculas/minúsculas, espaços excedentes e caracteres não imprimíveis).
 - Existe uma célula contendo exatamente o texto "VOLUMETRIA NO PERIODO".
 - A linha imediatamente acima e 1 coluna à direita da célula "VOLUMETRIA NO PERIODO" contém os nomes dos serviços.
 - A linha da célula "VOLUMETRIA NO PERIODO" contém os valores de volumetria.
 - A linha imediatamente abaixo da célula "VOLUMETRIA NO PERIODO" contém os valores de Volumetria com Peso.
 - Existe uma célula contendo exatamente o texto "CUSTO DE OUTROS - Robo - UN02".
 - Existe uma célula contendo exatamente o texto "CUSTO DE OUTROS - Robo - UN03".
 - Existe uma célula contendo exatamente o texto "CUSTO DE OUTROS - Robo - UN12".
 - Para cada um dos três rótulos acima, o valor do custo deve estar na mesma linha, sendo considerado o primeiro valor preenchido à direita do respectivo rótulo.
 - Existe uma célula contendo exatamente o texto "Base Financeira:" na aba "$", utilizada para retorno da data-base.
*/

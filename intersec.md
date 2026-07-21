# Copa do Brasil 2020 — Fórmulas DAX Completas para Power BI

---

## PASSO 0: TABELA AUXILIAR "VisaoTime"

Antes de qualquer KPI, crie uma tabela calculada. Isso transforma a visão "por jogo" em "por time",
permitindo que qualquer medida funcione com um simples arraste de campo.

**Power BI → Modelação → Nova Tabela → cole:**

```
VisaoTime =
UNION(
    SELECTCOLUMNS(
        FILTER('CopaDoBrasil', 'CopaDoBrasil'[time_mandante] <> ""),
        "Time",             'CopaDoBrasil'[time_mandante],
        "Adversario",       'CopaDoBrasil'[time_visitante],
        "Fase",             'CopaDoBrasil'[fase],
        "TipoFase",         'CopaDoBrasil'[tipo_fase],
        "Data",             'CopaDoBrasil'[data],
        "Estadio",          'CopaDoBrasil'[estadio],
        "Arbitro",          'CopaDoBrasil'[arbitro],
        "Publico",          'CopaDoBrasil'[publico],
        "PublicoMax",       'CopaDoBrasil'[publico_max],
        "Tecnico",          'CopaDoBrasil'[tecnico_mandante],
        "ValorEquipe",      'CopaDoBrasil'[valor_equipe_titular_mandante],
        "IdadeMedia",       'CopaDoBrasil'[idade_media_titular_mandante],
        "GolsPro",          'CopaDoBrasil'[gols_mandante],
        "GolsContra",       'CopaDoBrasil'[gols_visitante],
        "Gols1TPro",        'CopaDoBrasil'[gols_1_tempo_mandante],
        "Gols1TContra",     'CopaDoBrasil'[gols_1_tempo_visitante],
        "Penalti",          'CopaDoBrasil'[penalti],
        "GolsPenaltiPro",   'CopaDoBrasil'[gols_penalti_mandante],
        "GolsPenaltiContra",'CopaDoBrasil'[gols_penalti_visitante],
        "Escanteios",       'CopaDoBrasil'[escanteios_mandante],
        "EscanteiosContra", 'CopaDoBrasil'[escanteios_visitante],
        "Faltas",           'CopaDoBrasil'[faltas_mandante],
        "FaltasContra",     'CopaDoBrasil'[faltas_visitante],
        "BolaParada",       'CopaDoBrasil'[chutes_bola_parada_mandante],
        "BolaParadaContra", 'CopaDoBrasil'[chutes_bola_parada_visitante],
        "Defesas",          'CopaDoBrasil'[defesas_mandante],
        "DefesasContra",    'CopaDoBrasil'[defesas_visitante],
        "Impedimentos",     'CopaDoBrasil'[impedimentos_mandante],
        "ImpedimentosContra",'CopaDoBrasil'[impedimentos_visitante],
        "Chutes",           'CopaDoBrasil'[chutes_mandante],
        "ChutesContra",     'CopaDoBrasil'[chutes_visitante],
        "ChutesFora",       'CopaDoBrasil'[chutes_fora_mandante],
        "ChutesForaContra", 'CopaDoBrasil'[chutes_fora_visitante],
        "Mando",            "Mandante"
    ),
    SELECTCOLUMNS(
        FILTER('CopaDoBrasil', 'CopaDoBrasil'[time_visitante] <> ""),
        "Time",             'CopaDoBrasil'[time_visitante],
        "Adversario",       'CopaDoBrasil'[time_mandante],
        "Fase",             'CopaDoBrasil'[fase],
        "TipoFase",         'CopaDoBrasil'[tipo_fase],
        "Data",             'CopaDoBrasil'[data],
        "Estadio",          'CopaDoBrasil'[estadio],
        "Arbitro",          'CopaDoBrasil'[arbitro],
        "Publico",          'CopaDoBrasil'[publico],
        "PublicoMax",       'CopaDoBrasil'[publico_max],
        "Tecnico",          'CopaDoBrasil'[tecnico_visitante],
        "ValorEquipe",      'CopaDoBrasil'[valor_equipe_titular_visitante],
        "IdadeMedia",       'CopaDoBrasil'[idade_media_titular_visitante],
        "GolsPro",          'CopaDoBrasil'[gols_visitante],
        "GolsContra",       'CopaDoBrasil'[gols_mandante],
        "Gols1TPro",        'CopaDoBrasil'[gols_1_tempo_visitante],
        "Gols1TContra",     'CopaDoBrasil'[gols_1_tempo_mandante],
        "Penalti",          'CopaDoBrasil'[penalti],
        "GolsPenaltiPro",   'CopaDoBrasil'[gols_penalti_visitante],
        "GolsPenaltiContra",'CopaDoBrasil'[gols_penalti_mandante],
        "Escanteios",       'CopaDoBrasil'[escanteios_visitante],
        "EscanteiosContra", 'CopaDoBrasil'[escanteios_mandante],
        "Faltas",           'CopaDoBrasil'[faltas_visitante],
        "FaltasContra",     'CopaDoBrasil'[faltas_mandante],
        "BolaParada",       'CopaDoBrasil'[chutes_bola_parada_visitante],
        "BolaParadaContra", 'CopaDoBrasil'[chutes_bola_parada_mandante],
        "Defesas",          'CopaDoBrasil'[defesas_visitante],
        "DefesasContra",    'CopaDoBrasil'[defesas_mandante],
        "Impedimentos",     'CopaDoBrasil'[impedimentos_visitante],
        "ImpedimentosContra",'CopaDoBrasil'[impedimentos_mandante],
        "Chutes",           'CopaDoBrasil'[chutes_visitante],
        "ChutesContra",     'CopaDoBrasil'[chutes_mandante],
        "ChutesFora",       'CopaDoBrasil'[chutes_fora_visitante],
        "ChutesForaContra", 'CopaDoBrasil'[chutes_fora_mandante],
        "Mando",            "Visitante"
    )
)
```

> **IMPORTANTE:** Após criar a tabela, vá em Modelo de Dados e crie o relacionamento:
> `VisaoTime[Time]`  N:*  ↔  `CopaDoBrasil[time_mandante]` (opcional, para filtros cruzados).
> Se quiser, crie também uma tabela auxiliar "DimFases" com as fases ordenadas para usar no eixo X.

---

## PASSO 0.2: TABELA AUXILIAR "DimFaseOrdem"

```
DimFaseOrdem =
DATATABLE(
    "Fase", STRING,
    "Ordem", INTEGER,
    {
        {"Oitavas De Final", 1},
        {"Quartas De Final", 2},
        {"Semi-Finais", 3},
        {"Final", 4}
    }
)
```

Relacione: `DimFaseOrdem[Fase]` → `VisaoTime[Fase]`

---

═══════════════════════════════════════════════════════
## PÁGINA 1 — "O VERDADEIRO CAMPEÃO: DINHEIRO × RESULTADO"
═══════════════════════════════════════════════════════

---

### KPI 1: CUSTO POR GOL

> Quanto cada gol do time custou, considering o valor do elenco titulat.

```
CustoPorGol =
DIVIDE(
    SUM(VisaoTime[ValorEquipe]),
    SUM(VisaoTime[GolsPro]),
    BLANK()
)
```

**Como usar:** Coloque `VisaoTime[Time]` no eixo de um Bar Chart e esta medida como valor.
Ordene do MENOR para o MAIOR — o menor custo por gol = time mais eficiente.

**Formato:** Formato de Moeda R$ (anela de formatação → R$).

---

### KPI 2: ROI FINANCEIRO (Retorno sobre Investimento)

> Mede quantos gols o time produziu a cada R$ 1 bilhão investido no elenco.
> Quanto MAIOR, mais eficiente financeiramente.

```
ROI_Financeiro =
DIVIDE(
    SUM(VisaoTime[GolsPro]),
    SUM(VisaoTime[ValorEquipe]) / 1000000000,
    BLANK()
)
```

**Interpretação:**
- ROI = 5.0 → cada R$ 1 bilhão gerou 5 gols
- ROI = 0.5 → cada R$ 1 bilhão gerou apenas 0.5 gols (ineficiente)

**Visual:** Bar Chart horizontal. Eixo Y = Time, Valor = ROI_Financeiro.
Adicione uma **linha de referência** na média geral (Analytics Pane → Linha → Constante).
Times acima da linha = "superaram o investimento". Abaixo = "desperdiçaram dinheiro".

---

### KPI 3: DESVIO DE VALOR vs RESULTADO

> Mede a "surpresa financeira" de cada jogo: quando um time mais barato
> arranca um resultado positivo contra um time mais caro.
> Quanto MAIOR o valor, maior a surpresa (e menor o poder aquisitivo determinou o resultado).

**PASSO 1 — Criar a medida (cole no Modelagem → Nova Medida):**

```
DesvioValorResultado =
VAR _meuValor = SUM(VisaoTime[ValorEquipe])
VAR _meusGols = SUM(VisaoTime[GolsPro])
VAR _golsSofridos = SUM(VisaoTime[GolsContra])
VAR _valorAdversario =
    CALCULATE(
        SUM(VisaoTime[ValorEquipe]),
        FILTER(
            VisaoTime,
            VisaoTime[Time] = EARLIER(VisaoTime[Adversario])
                && VisaoTime[Data] = EARLIER(VisaoTime[Data])
        )
    )
VAR _diferencaValor = _valorAdversario - _meuValor
VAR _resultadoGols = _meusGols - _golsSofridos   
RETURN
    IF(
        _diferencaValor > 0 && _resultadoGols >= 0,
        DIVIDE(_resultadoGols * _diferencaValor, 1000000, 0),
        IF(
            _diferencaValor > 0 && _resultadoGols < 0,
            DIVIDE(_resultadoGols * _diferencaValor, 1000000, 0),
            0
        )
    )
```

**PASSO 2 — Criar uma medida auxiliar para o label (nome do jogo):**

```
NomeJogo =
VAR _mandante = MAX(VisaoTime[Time])
VAR _visitante = MAX(VisaoTime[Adversario])
VAR _data = MAX(VisaoTime[Data])
RETURN
    _mandante & " x " & _visitante & " (" & _data & ")"
```

**PASSO 3 — Montar o Scatter Plot (passo a passo):**

1. Na aba **Visualizações**, clique no ícone **Scatter Chart** (bolhas)
2. Arraste os campos EXATAMENTE nestas posições:
   - **Eixo X (Valores de detalhe):** `DesvioValorResultado` (a medida que criou)
   - **Eixo Y:** `GolsPro` (soma)
   - **Detalhes (bolhas):** `NomeJogo` (a medida auxiliar)
   - **Tamanho da bolha:** `Publico` (soma) — jogos com mais público = bolha maior
   - **Cor:** crie uma medida condicional:
     ```
     CorDesvio =
         IF([DesvioValorResultado] > 0, "#00C853", "#FF1744")
     ```
     E coloque no campo **Legenda/Cores** do scatter
3. No painel **Formato → Título**, escreva: "Mapa de Surpresas Financeiras"
4. No painel **Analytics → Linha de referência**, adicione:
   - Linha Constante no eixo X = 0 (separa "surpresas" de "favoritos")
   - Linha Constante no eixo Y = média de gols

**PASSO 4 — Interpretar os quadrantes:**

| Posição | Significado | Cor |
|---------|-------------|-----|
| Direita + Alta (X>0, Y>alto) | SURPRESA ÉPICA — time barato ganhou com gols de um time caro | Verde |
| Direita + Baixa (X>0, Y<baixo) | SURPRESA MODERADA — time barato empatou ou perdeu pouco | Verde claro |
| Esquerda (X<0) | FAVORITO CUMPRIU — time caro ganhou como esperado | Vermelho |
| Próximo de X=0 | JOGO EQUILIBRADO — valores parecidos | Cinza |

**Exemplo prático:**
- Palmeiras (R$ 45M) 2 x 0 Grêmio (R$ 52M):差= -7M, resultado=+2 → Desvio pequeno (favorito)
- América-MG (R$ 3M) 0 x 2 Palmeiras (R$ 62M):差= -59M, resultado=+2 → Desvio NEGATIVO (favorito dominou)
- Cuiabá (R$ 4.5M) 1 x 2 Grêmio (R$ 50M):差= -45.5M, resultado=+1 → Desvio pequeno

> **DICA DE PORTFOLIO:** Adicione um **tooltip customizado** — crie uma página nova
> chamada "TooltipDesvio" com 4 cards (Time, ValorEquipe, GolsPro, GolsContra)
> e em Format → Tooltip → Report page selecione "TooltipDesvio".
> Ao passar o mouse sobre cada bolha, aparece o detalhe do jogo.

---

### KPI 4: EFICIÊNCIA DE GOLS

> Gols produzidos a cada R$ 1 milhão investido.

```
EficienciaGols =
DIVIDE(
    SUM(VisaoTime[GolsPro]),
    SUM(VisaoTime[ValorEquipe]) / 1000000,
    BLANK()
)
```

**Visual:** KPI Card gigante no topo do dashboard.
Filtre por time usando um slicer. O número aparece tipo "0.15 gols por R$ 1M".

---

═══════════════════════════════════════════════════════
## PÁGINA 2 — "DNA TÁTICO: O PULSAR DE CADA TIME"
═══════════════════════════════════════════════════════

---

### KPI 5: ÍNDICE DE PRESSÃO

> Quanto mais alto, mais o time pressiona (chuta, cobra escanteio, comete faltas).
> É um indicador de "jogo agressivo".

```
IndicePressao =
VAR _chutes = SUM(VisaoTime[Chutes])
VAR _escanteios = SUM(VisaoTime[Escanteios])
VAR _faltas = SUM(VisaoTime[Faltas])
VAR _jogos = COUNTROWS(VisaoTime)
RETURN
    DIVIDE(_chutes + _escanteios + _faltas, _jogos, 0)
```

**Visual:** Radar Chart (veja instruções abaixo no final).

---

### KPI 6: EFICIÊNCIA DEFENSIVA

> Relação entre defesas feitas e a ameaça sofrida.
> Quanto MAIOR, melhor a defesa neutraliza o ataque adversário.

```
EficienciaDefensiva =
VAR _defesas = SUM(VisaoTime[Defesas])
VAR _chutesSofridos = SUM(VisaoTime[ChutesContra])
VAR _golsSofridos = SUM(VisaoTime[GolsContra])
RETURN
    DIVIDE(
        _defesas,
        _golsSofridos + _chutesSofridos,
        0
    )
```

**Interpretação:** Valor alto = defesa aguenta muita pressão e poupa gols.
Valor baixo = defesa não resiste.

---

### KPI 7: DOMÍNIO DE BOLA PARADA

> Quanto do jogo ofensivo vem de jogadas paradas (escanteios + chutes de bola parada).

```
DominioBolaParada =
VAR _ofensivaParada = SUM(VisaoTime[Escanteios]) + SUM(VisaoTime[BolaParada])
VAR _ofensivaTotal = _ofensivaParada + SUM(VisaoTime[Chutes])
RETURN
    DIVIDE(_ofensivaParada, _ofensivaTotal, 0)
```

**Formato:** Percentual (0.0 → 35%).
**Visual:** Donut Chart ou Pie Chart. Fatia = Bola Parada, Fatia Restante = Jogo Aberto.

---

### KPI 8: RITMO DE PRODUÇÃO DE GOLS

> Média de gols por jogo do time. Indica o "ritmo ofensivo".

```
RitmoProducao =
VAR _totalGols = SUM(VisaoTime[GolsPro])
VAR _jogos = COUNTROWS(VisaoTime)
RETURN
    DIVIDE(_totalGols, _jogos, 0)
```

**Visual:** Gauge Chart. Meta = 1.5 (média do campeonato). Valor = RitmoProducao.
Se > 1.5 = acima da média (verde). Se < 1.5 = abaixo (vermelho).

---

═══════════════════════════════════════════════════════
## PÁGINA 3 — "A PSICOLOGIA DO MATADOR"
═══════════════════════════════════════════════════════

---

### KPI 9: ÍNDICE DE VIRADA

> Dos jogos em que o time perdia, quantos ele virou?
> Retorna um número de 0 a 1 (1 = virou todos).

```
IndiceVirada =
VAR _jogosComGolsContra =
    CALCULATETABLE(
        VisaoTime,
        VisaoTime[GolsContra] > 0
    )
VAR _jogosPerdendoQueVirou =
    COUNTROWS(
        FILTER(
            _jogosComGolsContra,
            VisaoTime[GolsPro] > VisaoTime[GolsContra]
        )
    )
VAR _totalJogosComGolsContra = COUNTROWS(_jogosComGolsContra)
RETURN
    DIVIDE(_jogosPerdendoQueVirou, _totalJogosComGolsContra, 0)
```

**Visual:** Bar Chart. Eixo = Time, Valor = IndiceVirada.
Adicione **data labels** mostrando "X de Y jogos virados".

---

### KPI 10: FATOR SOB PRESSÃO (Gols nos 15 Minutos Finais)

> Proxy: gols do 2º tempo menos gols do 1º tempo.
> Se o time marca muito mais no 2T, ele "acelera" sob pressão.

```
FatorSobPressao =
VAR _gols1T = SUM(VisaoTime[Gols1TPro])
VAR _golsTotal = SUM(VisaoTime[GolsPro])
VAR _gols2T = _golsTotal - _gols1T
RETURN
    DIVIDE(_gols2T - _gols1T, _golsTotal, 0)
```

**Interpretação:**
- Valor positivo = time marca mais no 2T (melhor sob pressão)
- Valor negativo = time marca mais no 1T (começa forte, mas cansa)
- Zero = equilibrado

**Visual:** Bar Chart divergente. Barras para a direita = positivo (verde), esquerda = negativo (vermelho).

---

### KPI 11: GOLS NO 1º TEMPO vs 2º TEMPO (por time)

```
GolsPrimeiroTempo = SUM(VisaoTime[Gols1TPro])

GolsSegundoTempo =
    SUM(VisaoTime[GolsPro]) - SUM(VisaoTime[Gols1TPro])
```

**Visual:** Clustered Bar Chart. Duas barras por time: 1T e 2T.
Mostra visualmente se o time "começa forte" ou "despacha no final".

---

### KPI 12: DEFESA DO EMPATE

> De todos os jogos empatados no 1T, quantos o time GANHOU no final?

```
DefesaDoEmpate =
VAR _empatadosNo1T =
    CALCULATETABLE(
        VisaoTime,
        VisaoTime[Gols1TPro] = VisaoTime[Gols1TContra]
    )
VAR _ganhouDestes =
    COUNTROWS(
        FILTER(
            _empatadosNo1T,
            VisaoTime[GolsPro] > VisaoTime[GolsContra]
        )
    )
RETURN
    DIVIDE(_ganhouDestes, COUNTROWS(_empatadosNo1T), 0)
```

**Visual:** Gauge Chart por time. Meta = 0.5 (50%).

---

═══════════════════════════════════════════════════════
## PÁGINA 4 — "O JOGO INVISÍVEL"
═══════════════════════════════════════════════════════

---

### KPI 13: ÍNDICE DE CAOS

> Quanto "barulho" o jogo tem: impedimentos + faltas + escanteios.
> Jogo com muita interrupção = caótico. Jogo limpo = fluido.

```
IndiceCaos =
VAR _totalCaos =
    SUM(VisaoTime[Impedimentos]) +
    SUM(VisaoTime[Faltas]) +
    SUM(VisaoTime[Escanteios])
VAR _totalOfensiva =
    _totalCaos + SUM(VisaoTime[Chutes]) + SUM(VisaoTime[BolaParada])
RETURN
    DIVIDE(_totalCaos, _totalOfensiva, 0)
```

**Interpretação:** 0.7 = 70% das ações ofensivas são interrupções (caótico).
0.3 = jogo fluido, poucas faltas.

**Visual:** Treemap. Cada retângulo = um jogo. Tamanho = IndiceCaos total. Cor = Escala de vermelho (caótico) a verde (limpo).

---

### KPI 14: ASSERTIVIDADE TÉCNICA

> Qual percentual dos chutes realmente vão na direção do gol?
> Mede a "qualidade da finalização".

```
AssertividadeTecnica =
VAR _chutes = SUM(VisaoTime[Chutes])
VAR _chutesFora = SUM(VisaoTime[ChutesFora])
VAR _chutesNoGol = _chutes - _chutesFora
RETURN
    DIVIDE(_chutesNoGol, _chutes, 0)
```

**Formato:** Percentual.
**Visual:** Bar Chart + Line Chart combo.
- Barras = Chutes totais (por time)
- Linha = AssertividadeTecnica
- Quem tem barra alta e linha baixa = "chuta pra tudo e erra tudo"

---

### KPI 15: EFICIÊNCIA CIRÚRGICA

> Gols por chute no gol. Quanto mais alto, mais "cirúrgico" é o ataque.

```
EficienciaCirurgica =
VAR _chutes = SUM(VisaoTime[Chutes])
VAR _chutesFora = SUM(VisaoTime[ChutesFora])
VAR _chutesNoGol = _chutes - _chutesFora
VAR _gols = SUM(VisaoTime[GolsPro])
RETURN
    DIVIDE(_gols, _chutesNoGol, 0)
```

**Interpretação:**
- 0.50 = cada 2 chutes no gol = 1 gol (excelente)
- 0.10 = cada 10 chutes no gol = 1 gol (fraco)

**Visual:** Scatter Plot. Eixo X = AssertividadeTecnica, Eixo Y = EficienciaCirurgica.
Cada bolha = um time. Adicione **quadrantes** (média de cada eixo).
- Superior direito = "Ataque Cirúrgico" (chuta certo E converte)
- Inferior esquerdo = "Ataque Ineficiente"

---

### KPI 16: DOMINÂNCIA TERRITORIAL

> O time cria mais oportunidades do que sofre?

```
DominanciaTerritorial =
VAR _ofensiva = SUM(VisaoTime[Chutes]) + SUM(VisaoTime[Escanteios])
VAR _defensiva = SUM(VisaoTime[ChutesContra]) + SUM(VisaoTime[EscanteiosContra])
RETURN
    DIVIDE(_ofensiva, _ofensiva + _defensiva, 0.5)
```

**Interpretação:**
- 0.65 = time domina 65% das oportunidades (muito bom)
- 0.35 = time é dominado (defensivo ou fraco)

**Visual:** Gauge Chart. Linha no 0.50 (meio campo). Verde acima, vermelho abaixo.

---

### KPI 17: PRESSÃO PSICOLÓGICA (Público)

> A torcida impacta? Time com mais público marca mais?

```
PressaoPsicologica =
VAR _publicoPct = DIVIDE(SUM(VisaoTime[Publico]), SUM(VisaoTime[PublicoMax]), 0)
VAR _golsPro = SUM(VisaoTime[GolsPro])
RETURN
    _publicoPct * _golsPro
```

**Visual:** Scatter Plot. Eixo X = `Publico/PublicoMax` (%), Eixo Y = `GolsPro`.
Se há correlação positiva = público ajuda. Se não = tanto faz.

---

═══════════════════════════════════════════════════════
## PÁGINA 5 — "MAPA DE CALOR DO TORNEIO"
═══════════════════════════════════════════════════════

---

### KPI 18: JOGO MAIS INTENSO

```
IntensidadeJogo =
    SUM(VisaoTime[GolsPro]) +
    SUM(VisaoTime[GolsContra]) +
    SUM(VisaoTime[Escanteios]) +
    SUM(VisaoTime[Faltas]) +
    SUM(VisaoTime[Chutes]) / 10
```

**Visual:** Top N Filter em um Card ou Table. Mostre Top 1 ou Top 5 jogos mais intensos.
Use como **visual de destaque** com nome do jogo + placar.

---

### KPI 19: MÉDIA DE GOLS POR FASE

```
MediaGolsPorFase =
VAR _totalGols = SUM(VisaoTime[GolsPro]) + SUM(VisaoTime[GolsContra])
VAR _jogos = COUNTROWS(VisaoTime) / 2
RETURN
    DIVIDE(_totalGols, _jogos, 0)
```

> **Nota:** Dividir por 2 porque VisaoTime tem 2 linhas por jogo (mandante + visitante).

**Visual:** Line Chart. Eixo X = Fase (ordenada pela DimFaseOrdem), Valor = MediaGolsPorFase.
Mostra se o campeonato ficou "mais ou menos gols" conforme avançou.

---

### KPI 20: MAIOR VIRADA DO TORNEIO

```
MaiorVirada =
VAR _tabela =
    ADDCOLUMNS(
        VisaoTime,
        "Diferenca1T", VisaoTime[Gols1TPro] - VisaoTime[Gols1TContra],
        "DiferencaFinal", VisaoTime[GolsPro] - VisaoTime[GolsContra]
    )
VAR _viradas =
    FILTER(
        _tabela,
        [Diferenca1T] < 0 && [DiferencaFinal] > 0
    )
RETURN
    MAXX(_viradas, ABS([Diferenca1T]) + [DiferencaFinal])
```

**Visual:** Card com o valor + Card com o nome do jogo (use TOPN + MAXX).

---

═══════════════════════════════════════════════════════
## BÔNUS — ÍNDICE DE GRANDEZA DO JOGO (IGJ)
═══════════════════════════════════════════════════════

A métrica "X" do portfolio. Uma nota de 0 a 100 que resume a "epicidade" de cada jogo.

```
IGJ =
VAR _gols = (SUM(VisaoTime[GolsPro]) + SUM(VisaoTime[GolsContra]))
VAR _publicoPct = DIVIDE(SUM(VisaoTime[Publico]), SUM(VisaoTime[PublicoMax]), 0)
VAR _escanteios = SUM(VisaoTime[Escanteios]) + SUM(VisaoTime[EscanteiosContra])
VAR _penaltis = (SUM(VisaoTime[GolsPenaltiPro]) + SUM(VisaoTime[GolsPenaltiContra]))
VAR _virada =
    IF(
        ABS(SUM(VisaoTime[Gols1TPro]) - SUM(VisaoTime[Gols1TContra])) > 0
        && ABS(SUM(VisaoTime[GolsPro]) - SUM(VisaoTime[GolsContra])) > 0,
        1.5,
        0
    )
VAR _pontos =
    (_gols * 3) +
    (_publicoPct * 20) +
    (_escanteios * 0.5) +
    (_penaltis * 8) +
    (_virada * 10)
VAR _normalizado = DIVIDE(_pontos, 30, 0)
RETURN
    MIN(_normalizado * 100, 100)
```

**Interpretação:**
- 0-30 = Jogo tranquilo, pouco aconteceu
- 30-60 = Jogo bom, com momentos
- 60-80 = Jogoão, muito conteúdo
- 80-100 = Jogo ÉPICO (raro)

**Visual:** Gauge Chart grande no centro do dashboard.
Filtre por jogo. O pontômetro mostra o IGJ.
Abaixo, uma **Table** com Top 10 jogos por IGJ ( Ranking de Epicidade).

---

═══════════════════════════════════════════════════════
## COMO CRIAR O RADAR CHART NO POWER BI
═══════════════════════════════════════════════════════

O Power BI **NÃO** tem Radar Chart nativo. Use uma dessas opções:

### Opção 1: Gráfico de Área Empilhada (simulação rápida)
1. Crie uma tabela de "Métricas" com 6 linhas: {Ataque, Defesa, Pressão, BolaParada, Eficiencia, PressaoPublico}
2. Crie 6 medidas (uma para cada eixo do radar)
3. Use **Gráfico de Área Empilhada** com a tabela de métricas no eixo X

### Opção 2: Visão Radar (GRATUITA — recomendo)
1. Vá em **Visualizações → ... (três pontinhos) → Importar visual do marketplace**
2. Busque **"Radar Chart"** by **Navamic** ou **"Spider Chart"**
3. Instale gratuitamente
4. Use `VisaoTime[Time]` como Série, e 6 medidas como Eixos

### As 6 medidas para o Radar:

```
RadarAtaque =
    DIVIDE(SUM(VisaoTime[Chutes]), MAXX(ALL(VisaoTime), SUM(VisaoTime[Chutes])), 0)

RadarDefesa =
    DIVIDE(SUM(VisaoTime[Defesas]), MAXX(ALL(VisaoTime), SUM(VisaoTime[Defesas])), 0)

RadarPressao = [IndicePressao]
    -- já normalizado pelo número de jogos

RadarBolaParada = [DominioBolaParada]

RadarEficiencia = [EficienciaCirurgica]

RadarPublico =
    DIVIDE(SUM(VisaoTime[Publico]), SUM(VisaoTime[PublicoMax]), 0)
```

> **DICA:** Para comparar dois times, adicione um **slicer duplo** e use：
> ```
> RadarAtaque_T1 = CALCULATE([RadarAtaque], VisaoTime[Time] = SELECTEDVALUE(Slicer1))
> RadarAtaque_T2 = CALCULATE([RadarAtaque], VisaoTime[Time] = SELECTEDVALUE(Slicer2))
> ```
> Assim dois polígonos aparecem sobrepostos — visual de scouting profissional.

---

═══════════════════════════════════════════════════════
## DICAS DE FORMATAÇÃO FINAL
═══════════════════════════════════════════════════════

### Paleta de Cores Sugerida
| Elemento | Cor | Código |
|----------|-----|--------|
| Fundo dashboard | Azul escuro | #0D1B2A |
| Cards KPI | Cinza escuro | #1B2838 |
| Texto principal | Branco | #FFFFFF |
| Destaque positivo | Verde | #00C853 |
| Destaque negativo | Vermelho | #FF1744 |
| Dourado (títulos) | Dourado | #D4AF37 |
| Barras neutras | Cinza médio | #546E7A |

### Fonte Recomendada
- Títulos: **Segoe UI Bold**, 16-20pt
- KPIs: **Segoe UI Semibold**, 28-36pt
- Corpo: **Segoe UI**, 10-12pt

### Animações
- **Page transitions:** Use Bookmarks + Buttons para navegar entre páginas como slides
- **Tooltips customizados:** Crie uma página "TooltipPage" e atribua em Formato → Page Information → Tooltip Report Page
- **Drill-through:** Configure em cada visual a opção de drill-through para a página "Detalhe do Jogo"

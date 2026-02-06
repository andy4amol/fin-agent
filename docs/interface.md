工具 Schema 说明文档

本文档描述各工具的用途及各参数作用，与具体实现代码解耦，仅作能力与参数说明。


---

1. knowledge（知识库）

当用户问题符合「查询内部知识库」的回复规则时使用。该工具包含两种用法，按问题类型二选一输出。

用法一：query（知识库 / 三分法查询）

适用于需要查询雪球三分法或其它内部知识库内容的问题，不涉及股票筛选。

参数
类型
必填
说明
query
string
是
用于查询雪球三分法相关问题的 query 字符串。根据用户意图生成最贴合检索意图的 query，供内部知识库检索使用。

用法二：stock-screener（股票筛选）

适用于公司/股票筛选类问题，按财务与估值等条件筛选标的（如「市盈率小于 20 的 A 股」「股息率最高的 10 只港股」等）。

筛选条件参数（范围格式统一说明）

以下条件均使用统一的范围字符串格式：

- 2_max：大于 2（即 >2）
- 0_2：小于 2（即 <2）
- min_2：小于 2（即 <2，部分字段用此表示下限）
- 2_4：2 到 4 之间（即 2–4）
- 0_max：排名前 N 名（即「前几名」场景，由 size 等控制数量）
带金额/规模的字段（如营业收入、负债）需将中文单位（亿、万、千）转为纯数字，例如：「1亿」→ 100000000，「2万」→ 20000，不保留单位。

参数
类型
必填
说明
dy_l
string
否
股息率筛选条件。格式见上（如 2_max、0_2、2_4、0_max）。
pettm
string
是
**市盈率(TTM)**筛选条件。格式同上。
pelyr
string
否
**市盈率(LYR)**筛选条件。格式同上。
roediluted
string
否
**净资产收益率(ROE)**筛选条件。格式同上。
pb
string
否
**市净率(MRQ)**筛选条件。格式同上。
netprofit
string
是
净利润筛选条件。格式同上（如 2_max、min_2、2_4、0_max）。
total_revenue
string
否
营业收入筛选条件。格式同上；若用户使用「亿/万/千」等单位，须转为完整数字。
tl
string
否
负债筛选条件。格式同上；单位处理同营业收入。默认 0_max。
category
string
是
市场类别。CN（沪深 A 股）、HK（港股）、US（美股）。默认 CN。
order_by
string
否
排序字段。可选：symbol、pct（涨跌幅）、dy_l、pettm、pelyr、roediluted、pb、netprofit、total_revenue、tl。默认 symbol。
size
number
否
需要返回的股票数量，默认 10。
order
string
是
排序顺序。asc（升序）、desc（降序）。默认 desc。

说明：Schema 中 stock-screener 的 required 包含 category、pettm、netprofi、order（其中 netprofi 疑为 netprofit 的拼写，以实际实现为准）。


---

2. webSearch（全网搜索）

用途

当任务类型为「全网搜索」时使用。用于在互联网上按关键词、行业、时间范围进行检索，获取与用户问题相关的公开信息。适用于需要外部资讯、新闻、行业动态等的问答场景。

参数说明

参数
类型
必填
说明
searchRequests
string[]
是
搜索请求列表。每个元素为一条搜索关键词（1–30 字）。应基于用户自然语言提炼最佳关键词，建议使用分词、多角度关键词，且与已查过的关键词角度区分。优先生成单一请求；仅当问题明显包含多个独立方面且单请求不足以回答时，才增加多条。条数上限由配置 maxWebSearchQueries 决定。
industry
string
是
限定搜索的行业站点。可选值：general（通用）、finance（金融）、law（法律）、medical（医疗）、internet（互联网精选）、tax（税务）、news_province（新闻省级）、news_center（新闻中央）。多行业用逗号分隔。默认 general。
timeRange
string
是
搜索结果的时间范围。可选：OneDay（1 天内）、OneWeek（1 周内）、OneMonth（1 月内）、OneYear（1 年内）、NoLimit（无限制，默认）。需结合用户问题和当前时间选择合适范围。


---

3. xqSearchQuery（雪球站内搜索）

用途

当任务类型为「雪球站内搜索」时使用。在雪球站内按关键词搜索内容，并可选择是否同时查公告。适用于在雪球社区内查找讨论、帖子、公告等与问题相关的内容。

参数说明

参数
类型
必填
说明
searchRequests
string[]
是
站内搜索关键词列表，每条 1–30 字。生成方式与全网搜索类似：基于用户意图、分词、多角度且与已查关键词区分。优先生成单条；仅当问题明显多维度且单条不足时才增加。条数上限由 maxXqSearchQueries 决定。
searchFilings
boolean
是
是否在关键词搜索基础上额外查询相关公告。true 表示需要查公告，false 表示不查。根据用户是否关心公告、披露信息等判断。
timeRange
string
是
站内搜索结果的时间范围。可选：OneDay、OneWeek、OneMonth、OneYear、NoLimit（默认）。结合用户问题和当前时间设定。
startDate
string
是
开始日期，格式 YYYY-MM-DD。用于精确限制时间范围。若用户问题不需要时间限制，则传空字符串。
endDate
string
是
结束日期，格式 YYYY-MM-DD。若不需要时间限制，则传空字符串。


---

4. xqSearchStockFeed（雪球个股检索）

用途

当任务类型为「雪球个股检索」时使用。针对某只股票、基金或指数，在雪球站内检索其行情、讨论、公告、大 V 等维度的信息。适用于用户问某标的的涨跌、讨论热度、公告、行情、影响力用户等场景。

参数说明

参数
类型
必填
说明
stockName
string
是
与用户问题最相关的股票、基金或指数的名称（非代码）。
stockSearchQuery
string
是
当系统无法解析出明确标的信息时，用此关键词做站内检索，作为兜底。
searchStockFeedNew
boolean
是

是否查询该标的对应时间段内的最新讨论。内容更新及时但可能含噪音。
searchStockFeedHot
boolean
是
是否查询该标的对应时间段内的最热讨论。讨论热度高于「最新讨论」。
searchStockNotice
boolean
是
是否查询该标的的公告（重大事项、业绩、风险、股权变动、发行、配股增发等）。
searchStockQuote
boolean
是
是否查询该标的的实时行情。
searchStockInfluencer

boolean
是
是否查询针对该标的发帖较多的影响力用户信息。
timeRange
string
是
检索内容的时间范围：OneDay、OneWeek、OneMonth、OneYear、NoLimit（默认）。
startDate
string
是
开始日期 YYYY-MM-DD；不需要时间限制时传空字符串。
endDate
string
是
结束日期 YYYY-MM-DD；不需要时间限制时传空字符串。


---

5. xqSearchUserFeed（雪球用户检索）

用途

当任务类型为「雪球用户检索」时使用。针对某个雪球用户或实体，检索其动态、简介、认证等信息。适用于用户问「某人在雪球上说了什么」「某用户资料」等与用户/实体相关的问题。

参数说明

参数
类型
必填
说明
userScreenName
string
是
与用户问题最相关的实体的雪球用户名。
filterQuery
string
是
与用户问题最相关的检索关键词，用于在用户动态中过滤内容。
userSearchQuery
string
是
当无法直接定位到雪球用户时，用此关键词做站内检索以找到相关用户或内容，作为兜底。
searchUserProfile
boolean
是
是否查询该用户的详细信息（简介、认证等）。true 需要，false 不需要。
timeRange
string
是
用户动态等结果的时间范围：OneDay、OneWeek、OneMonth、OneYear、NoLimit（默认）。
startDate
string
是
开始日期 YYYY-MM-DD；不需要时间限制时传空字符串。
endDate
string
是
结束日期 YYYY-MM-DD；不需要时间限制时传空字符串。


---

6. xqVisit（雪球页面访问）

用途

当任务类型为「雪球页面访问」时使用。直接访问用户问题相关的雪球站内 URL，获取页面内容。适用于用户给链接、或问题明确对应某个雪球页面（如个股页、用户主页、帖子页等）的场景。

参数说明

参数
类型
必填
说明
urlTargets
string[]
是
要访问的雪球站内 URL 列表。数量至少 1 条，最多 5 条。应选择与用户问题最相关的页面 URL。


---

时间范围枚举统一说明

以下工具中出现的 timeRange 均使用同一套枚举：

- OneDay：1 天内  
- OneWeek：1 周内  
- OneMonth：1 月内  
- OneYear：1 年内  
- NoLimit：超过一年 / 无限制（默认）
与 startDate、endDate 配合使用时，由具体实现决定以哪个为准（通常精确日期优先）。


---

与配置相关的数量上限

- webSearch 的 searchRequests 条数：由 maxWebSearchQueries 决定，默认 1。  
- xqSearchQuery 的 searchRequests 条数：由 maxXqSearchQueries 决定，默认 3。  


意图分类模块 - 补充工具需求文档
🛠 工具详细接口规范
以下定义了新增参数及新工具的详细 Spec，请研发同学据此评估开发。
1. xqSearchQuery (雪球站内搜索) - 参数增强
变更点：新增 `scope` 参数，用于精准控制搜索结果的内容来源。

*   scope (`string`, 必填)
    *   说明：内容来源范围。用于过滤搜索结果的类型，降低噪音。
    *   示例：`"pgc"`
    *   枚举值：
        *   all: 全量搜索 (默认)
        *   pgc: 仅搜索pgc专业生产内容 (搜索业务已梳理对应标签)
        *   ugc: 仅搜索ugc用户生产内容 (搜索业务已梳理对应标签)

---
2. xqSearchStockFeed (雪球个股检索) - 参数增强
变更点：新增 `scope` 参数控制帖子流类型；新增 `searchStockAbnormal` 参数获取异动归因。

*   scope (`string`, 必填)
    *   说明：个股讨论流的内容来源。
    *   示例：`"all"`
    *   枚举值：
        *   all: 全量 (默认)
        *   pgc: 仅看新闻/资讯/公告
        *   ugc: 仅看球友讨论
*   searchStockAbnormal (`boolean`, 必填)
    *   说明：是否查询异动归因。（行情业务已有对应数据）
    *   示例：`true`
    *   枚举值：
        *   true: 查询该标的在 timeRange 指定区间内的异动点及区间异动总结（points）。若无异动，返回 null。
        *   false: 不查询 (默认)。

返回结构补充说明 (searchStockAbnormal=true 时)：
应返回一个 abnormal_events 数组，包含：
- date: 异动日期
- type: 异动类型 (异动点/异动区间）
- result: 涨/跌
- reason: 异动原因摘要 

---
3. [NEW] xqStockFinancialData (雪球个股财务数据) - 新增工具

用途：
专用于 `DATA_QUERY` 意图。检索个股在特定时间段内的结构化财务指标。支持历史财报数据
参数说明：
*   symbol (`string`, 必填)
    *   说明：股票代码。
    *   示例：`"SH600519"`
*   metrics (`string[]`, 必填)
    *   说明：需查询的财务指标列表。
    *   示例：`["net_profit", "revenue", "pe_ttm"]`
    *   支持字段：
        *   dy_l (股息率)
        *   pe_ttm (市盈率TTM)
        *   pe_lyr (市盈率LYR)
        *   roe (净资产收益率)
        *   pb (市净率)
        *   net_profit (净利润)
        *   revenue (营业收入)
        *   total_liabilities (总负债)
        *   eps (每股收益)
*   period (`string`, 必填)
    *   说明：数据报告期/时间类型。
    *   示例：`"2023_q4"`
    *   枚举值：
        *   latest: 最新一期财报数据 (默认)
        *   realtime: 实时数据 (针对 PE/PB/股息率等)
        *   2023_q4: 指定具体财报期 (格式：YYYY_Q1/Q2/Q3/Q4)
        *   `forecast`: 机构预期
*   count (`number`, 选填)
    *   说明：返回的历史期数。默认 1。例如 period="latest", count=3 表示返回最近 3 期。
    *   示例：`1`
返回结构示例：
{
  "symbol": "SH600519",
  "data": [
    {
      "period": "2023_Q4",
      "net_profit": 747.34, // 单位：亿 (需统一单位标准)
      "revenue": 1476.94,
      "pe_ttm": 25.6
    }
  ]
}

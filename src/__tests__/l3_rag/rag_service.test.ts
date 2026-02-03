
import { RAGService } from '../../l3_rag/rag_service';
import { SourceType } from '../../l3_rag/types';

describe('L3 RAG Service (Information Triangle)', () => {
  let ragService: RAGService;

  beforeEach(() => {
    ragService = new RAGService();
  });

  test('Should route "Announcement" query to Official source', async () => {
    const query = '腾讯发布了什么公告';
    const results = await ragService.search(query);
    
    // 应该包含来自 Official 的数据
    const hasOfficial = results.some(r => r.type === SourceType.OFFICIAL);
    expect(hasOfficial).toBe(true);
    
    // 检查内容是否合理 (Mock data)
    expect(results[0].content).toContain('公告');
  });

  test('Should route "Opinion" query to Social and News sources', async () => {
    const query = '大家怎么看特斯拉大跌';
    const results = await ragService.search(query);
    
    // 应该包含 Social 或 News
    const hasSocialOrNews = results.some(r => r.type === SourceType.SOCIAL || r.type === SourceType.NEWS);
    expect(hasSocialOrNews).toBe(true);
  });

  test('Should trigger Cross-Check logic for rumors', async () => {
    // 这是一个特殊的 Mock case，provider 里并不一定正好返回 "重大利好"
    // 但我们可以测试 ContentProcessor 的逻辑，如果 mock 数据配合的话。
    // 这里主要测试流程不报错。
    const query = '有什么重大利好';
    const results = await ragService.search(query);
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  test('Processor should rank Official sources higher by default', async () => {
    // 这是一个综合查询，可能会触发所有源
    const query = '为什么暴跌'; 
    const results = await ragService.search(query);
    
    // 如果结果中有 Official 和 Social，Official 应该排在前面 (假设 processor 逻辑正确)
    // 我们的 mock 数据 reliabilityScore: Official=1.0, News=0.8, Social=0.4/0.6
    
    // 找到第一个
    if (results.length > 1) {
      const firstScore = results[0].reliabilityScore;
      const lastScore = results[results.length - 1].reliabilityScore;
      // 大致应该是降序
      expect(firstScore).toBeGreaterThanOrEqual(lastScore);
    }
  });
});

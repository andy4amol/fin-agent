import { VectorDocument } from '../types';

/**
 * L3 RAG - Vector Database
 * 向量数据库，用于相似度检索
 */
export class VectorDB {
  private data: VectorDocument[] = [];

  /**
   * 添加文档到向量数据库
   * @param docId 文档ID
   * @param content 文档内容
   * @param embedding 文档向量嵌入
   */
  addDocument(docId: string, content: string, embedding: number[]): void {
    this.data.push({
      id: docId,
      content,
      embedding,
    });
  }

  /**
   * 向量相似度检索 (Mock)
   * @param queryEmbedding 查询向量
   * @param topK 返回结果数量
   * @returns 最相似的文档列表
   */
  searchSimilar(queryEmbedding: number[], topK: number = 3): VectorDocument[] {
    // 真实场景会计算 cosine similarity
    // 这里简单返回前 k 个
    return this.data.slice(0, topK);
  }

  /**
   * 获取数据库中文档总数
   * @returns 文档数量
   */
  size(): number {
    return this.data.length;
  }

  /**
   * 清空数据库
   */
  clear(): void {
    this.data = [];
  }
}

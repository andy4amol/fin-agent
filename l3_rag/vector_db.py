# l3_rag/vector_db.py

class VectorDB:
    def __init__(self):
        self.data = []

    def add_document(self, doc_id, content, embedding):
        """
        添加文档
        """
        self.data.append({
            "id": doc_id,
            "content": content,
            "embedding": embedding
        })

    def search_similar(self, query_embedding, top_k=3):
        """
        向量相似度检索 (Mock)
        """
        # 真实场景会计算 cosine similarity
        # 这里简单返回前 k 个
        return self.data[:top_k]

# l3_rag/source_ranker.py

class SourceRanker:
    def rank(self, search_results):
        """
        对检索结果进行排序和过滤
        """
        # 简单逻辑: 按 relevance 降序排序
        sorted_results = sorted(search_results, key=lambda x: x.get('relevance', 0), reverse=True)
        # 过滤低相关性内容 (示例阈值 0.6)
        # filtered = [r for r in sorted_results if r['relevance'] >= 0.6]
        
        # 为了演示，全部返回但排好序
        return sorted_results

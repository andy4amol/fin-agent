# l4_inference/llm_router.py
from l4_inference.llm_service import LLMService

class LLMRouter:
    @staticmethod
    def get_service(task_type="detailed_report"):
        """
        根据任务类型路由到不同的模型
        """
        if task_type == "detailed_report":
             # 复杂任务用更强的模型 (SiliconFlow GLM-4.7)
             return LLMService(provider="Pro/zai-org/GLM-4.7", api_key="sk-ttaujshlnuvdoowlonucizhzbhkxaqiujrabedanoczwwbus")
        else:
             return LLMService(provider="Qwen/Qwen2.5-7B-Instruct")

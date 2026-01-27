# l4_inference/llm_service.py
import asyncio
import os
import json
import aiohttp

class LLMService:
    def __init__(self, provider="mock", api_key=None, base_url="https://api.siliconflow.cn/v1"):
        self.provider = provider
        self.api_key = api_key or os.getenv("SILICONFLOW_API_KEY")
        self.base_url = base_url

    async def generate(self, prompt, system_prompt="你是一个有用的助手"):
        """
        调用大模型生成文本
        """
        if self.provider.startswith("mock"):
            return await self._generate_mock()
        
        return await self._generate_api(prompt, system_prompt)

    async def _generate_mock(self):
        print(f"[L4] Generating response using {self.provider}...")
        await asyncio.sleep(1)
        return f"""
(Mock LLM Response from {self.provider})

**盈亏综述**
账户整体盈利，主要得益于重仓股表现良好。

**归因分析**
- 0700.HK: 腾讯近期发布财报超预期，加上游戏版号发放常态化，带动股价上涨。
- BABA: 阿里拆分消息落地，市场情绪回暖。

**风险提示**
当前持仓科技股占比较高，需注意板块回调风险。

**操作建议**
建议继续持有，可适当关注低估值的红利股以平衡风险。
"""

    async def _generate_api(self, prompt, system_prompt):
        print(f"[L4] Calling SiliconFlow API for model: {self.provider}...")
        
        if not self.api_key:
            return "[Error] API Key not found. Please set SILICONFLOW_API_KEY environment variable."

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        payload = {
            "model": self.provider,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "enable_thinking": False,
            "stream": True,
            "stream_options": {"include_usage": True} 
        }

        try:
            import time
            start_time = time.time()
            full_content = ""
            usage_info = None
            
            print(f"\n[L4 Stream Start - {self.provider}]\n")
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        return f"[Error] API request failed: {response.status} - {error_text}"
                    
                    async for line in response.content:
                        line = line.decode('utf-8').strip()
                        if line.startswith("data: ") and line != "data: [DONE]":
                            json_str = line[6:]  # Remove "data: "
                            try:
                                chunk = json.loads(json_str)
                                
                                # Handle usage info if present (often in the last chunk with empty choices)
                                if "usage" in chunk and chunk["usage"]:
                                    usage_info = chunk["usage"]
                                
                                # Handle content delta
                                if "choices" in chunk and chunk["choices"]:
                                    choice = chunk["choices"][0]
                                    delta = choice.get("delta", {})
                                    content_piece = delta.get("content", "")
                                    if content_piece:
                                        print(content_piece, end="", flush=True)
                                        full_content += content_piece
                            except json.JSONDecodeError:
                                pass
            
            end_time = time.time()
            duration = end_time - start_time
            print("\n") # Newline after stream
            
            # Print Stats
            if usage_info:
                total_tokens = usage_info.get("total_tokens", 0)
                completion_tokens = usage_info.get("completion_tokens", 0)
                # Note: SiliconFlow/OpenAI usage in stream might be just the delta or final total. 
                # Usually standard is final chunk has usage.
                
                # If we didn't get completion tokens from API, iterate to estimate or just show total
                tokens_generated = completion_tokens if completion_tokens > 0 else len(full_content) # Fallback to rough char count if 0
                
                speed = tokens_generated / duration if duration > 0 else 0
                print(f"[Stats] Generated {tokens_generated} tokens in {duration:.2f}s ({speed:.2f} t/s)")
                print(f"[Stats] Total usage: {total_tokens} tokens")
            else:
                 # Fallback if no usage info provided
                 speed = len(full_content) / duration if duration > 0 else 0
                 print(f"[Stats] Generated {len(full_content)} chars in {duration:.2f}s (Approx {speed:.2f} chars/s)")
            
            print(f"[L4 Stream End]\n")
            return full_content

        except Exception as e:
            return f"[Error] Exception during API call: {str(e)}"

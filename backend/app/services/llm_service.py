"""
LLM Service: Groq (primary) → OpenRouter Qwen (fallback)
"""
from typing import Optional
import json
from app.config import settings


async def get_llm_response(messages: list, temperature: float = 0.3) -> str:
    """Try Groq first, fall back to OpenRouter Qwen."""
    if settings.GROQ_API_KEY:
        try:
            return await _groq_chat(messages, temperature)
        except Exception as e:
            print(f"Groq failed: {e}, falling back to OpenRouter")

    if settings.OPENROUTER_API_KEY:
        return await _openrouter_chat(messages, temperature)

    return _mock_llm_response(messages)


async def _groq_chat(messages: list, temperature: float) -> str:
    from groq import AsyncGroq
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    response = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=2048,
    )
    return response.choices[0].message.content


async def _openrouter_chat(messages: list, temperature: float) -> str:
    import httpx
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://testzoo.app",
                "X-Title": "TestZoo",
            },
            json={
                "model": settings.OPENROUTER_MODEL,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": 2048,
            },
        )
        data = response.json()
        return data["choices"][0]["message"]["content"]


def _mock_llm_response(messages: str) -> str:
    last_msg = messages[-1]["content"] if messages else ""
    return json.dumps({
        "query": last_msg[:100],
        "cancer_type": "lung",
        "biomarkers": ["EGFR", "ALK"],
        "urgency": "routine",
        "suggested_categories": ["Molecular Oncology", "Companion Diagnostics"],
        "clinical_summary": "Patient case suggests molecular profiling for targeted therapy selection.",
    })


async def extract_clinical_intent(case_description: str) -> dict:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a clinical diagnostic advisor for TestZoo marketplace. "
                "Extract structured diagnostic search parameters from the doctor's case description. "
                "Return ONLY valid JSON with keys: query, cancer_type, biomarkers (list), urgency, "
                "suggested_categories (list), clinical_summary."
            ),
        },
        {
            "role": "user",
            "content": f"Doctor's case: {case_description}\n\nExtract diagnostic search parameters as JSON.",
        },
    ]
    raw = await get_llm_response(messages, temperature=0.1)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        return json.loads(raw[start:end])
    except Exception:
        return {
            "query": case_description[:200],
            "cancer_type": "unspecified",
            "biomarkers": [],
            "urgency": "routine",
            "suggested_categories": ["General Diagnostics"],
            "clinical_summary": case_description[:300],
        }


async def generate_recommendation_reasoning(test_name: str, case_description: str) -> str:
    messages = [
        {
            "role": "system",
            "content": "You are a clinical diagnostic expert. Write 2-3 sentences of clinical reasoning for recommending a specific test for a patient case. Be precise and clinician-friendly.",
        },
        {
            "role": "user",
            "content": f"Test: {test_name}\nCase: {case_description}\n\nProvide clinical reasoning:",
        },
    ]
    return await get_llm_response(messages, temperature=0.4)

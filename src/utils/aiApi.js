export async function fetchAiAdvice(prompt) {
    const response = await fetch('/api/genai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error('AI API error');
    const data = await response.json();
    return data.result;
}
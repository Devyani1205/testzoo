export interface StreamChunk {
  type: 'intent_start' | 'intent_chunk' | 'search_start' | 'test_result' | 'complete' | 'error';
  data?: any;
  message?: string;
  component?: any;
  timestamp?: string;
}

export async function streamReader(
  stream: ReadableStream<Uint8Array>,
  onChunk: (chunk: StreamChunk) => void
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line.startsWith('data: ')) {
          try {
            const chunk = JSON.parse(line.slice(6));
            onChunk(chunk);
          } catch (e) {
            console.error('Failed to parse chunk:', e);
          }
        }
      }

      buffer = lines[lines.length - 1];
    }

    if (buffer.trim().startsWith('data: ')) {
      try {
        const chunk = JSON.parse(buffer.trim().slice(6));
        onChunk(chunk);
      } catch (e) {
        console.error('Failed to parse final chunk:', e);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

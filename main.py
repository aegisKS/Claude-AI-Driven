import os
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def chat(user_message: str) -> str:
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": user_message}],
    )
    return message.content[0].text


def main():
    print("Claude AI Chat (終了するには 'quit' と入力)")
    while True:
        user_input = input("\nあなた: ").strip()
        if user_input.lower() in ("quit", "exit", "q"):
            break
        if not user_input:
            continue
        response = chat(user_input)
        print(f"\nClaude: {response}")


if __name__ == "__main__":
    main()

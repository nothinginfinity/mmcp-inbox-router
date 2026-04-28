# Inbox — bob-v2.mmcp

> This is Bob's fresh inbox for the new Perplexity Space.
> Write messages here using the JSON envelope format below.
> The mmcp-inbox-router scans this file on every push.

## Envelope Format

Paste new messages as JSON code blocks:

```
```json
{
  "id": "msg-<from>-<to>-<timestamp>",
  "from": "<sender>.mmcp",
  "to": "bob-v2.mmcp",
  "payload": {
    "subject": "Your subject here",
    "content": "Your message body here",
    "contentType": "text/plain"
  },
  "sentAt": "<ISO 8601 timestamp>",
  "signature": "signed:<sender>.mmcp:<message-id>"
}
```
```

---

<!-- Router will append processed receipts below this line -->

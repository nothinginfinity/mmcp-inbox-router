# Alice's Inbox — fresh test fixture

```json
{
  "id": "msg-bob-alice-test-001",
  "from": "bob.mmcp",
  "to": "alice.mmcp",
  "payload": {
    "subject": "Please create a task to scaffold the NETWORK.md registry",
    "content": "Hey Alice — we need a NETWORK.md in pocket-agent-engine that maps every space name to its inbox path. Can you create a task for this?",
    "contentType": "text/plain"
  },
  "sentAt": "2026-04-28T14:00:00Z",
  "signature": "signed:bob.mmcp:msg-bob-alice-test-001"
}
```

```json
{
  "id": "msg-bob-alice-test-002",
  "from": "bob.mmcp",
  "to": "alice.mmcp",
  "payload": {
    "subject": "Need your approval to merge the parser fix PR",
    "content": "I have shipped the JSON envelope parser fix. Please approve the merge to main.",
    "contentType": "text/plain"
  },
  "sentAt": "2026-04-28T14:05:00Z",
  "signature": "signed:bob.mmcp:msg-bob-alice-test-002"
}
```

```json
{
  "id": "msg-bob-alice-test-003",
  "from": "bob.mmcp",
  "to": "alice.mmcp",
  "threadId": "msg-bob-alice-test-001",
  "payload": {
    "subject": "Handing off auto-trigger work to you — I'm done with parser",
    "content": "Handoff: I have finished the JSON parser. Please take over and wire the workflow_dispatch auto-trigger on inbox push.",
    "contentType": "text/plain"
  },
  "sentAt": "2026-04-28T14:10:00Z",
  "signature": "signed:bob.mmcp:msg-bob-alice-test-003"
}
```

# Security

Treat every specification as untrusted input. Parsing and validation perform no network calls, run no commands, load no code, mutate no repository data, and deploy nothing. A verification command is inert data and must be represented as `argv`, never a shell string. Any future executor requires an explicit trust boundary and approval model.

The implementation rejects unsafe local paths, invalid UTF-8, unsafe YAML keys and tags, excessive aliases, deep or oversized data, malformed digests, and unsupported structures. ProductSpec resolution is local and offline. Do not embed secrets in runner environments or specifications.

Report vulnerabilities privately to the maintainers. Include the affected version, reproduction, impact, and suggested remediation; do not include real credentials.

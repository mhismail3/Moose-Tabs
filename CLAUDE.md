# CLAUDE.md - Memory Information

## Memory Bank/Log System

When asked to construct a Memory Bank/Log system for project task tracking, use this standardized format:

### Directory Structure
```
memory-bank/
├── README.md
├── task-logs/
│   └── task-log-template.md
├── bug-reports/
│   └── bug-report-template.md
├── phase-progress/
│   └── phase-progress-tracker.md
└── session-logs/
    └── session-log-template.md
```

### Key Components

1. **Task Logs** - Track individual task execution
   - Map to implementation plan phases (e.g., 1.1, 2.3, 3.2)
   - Include TDD approach (test-first development)
   - Track attempts, results, and next steps
   - Link to test results and dependencies

2. **Bug Reports** - Track issues and resolutions
   - Unique bug IDs with timestamps
   - Link to related tasks from implementation plan
   - Include investigation and resolution logs
   - Track severity and status

3. **Phase Progress** - High-level progress tracking
   - Map to implementation plan phases
   - Show completion rates and blockers
   - Track dependencies between phases
   - Overall project status dashboard

4. **Session Logs** - Agent work summaries
   - Track objectives and accomplishments
   - Record decisions and knowledge gained
   - Plan next session priorities
   - Update phase status changes

### Templates Created
- Use provided templates for consistent logging
- Each template includes correlation to implementation plan
- Templates support TDD methodology
- All logs interconnect via task/bug IDs

This system ensures comprehensive tracking that correlates directly with structured implementation plans.
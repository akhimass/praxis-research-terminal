from __future__ import annotations

from backend.models.research_program import GanttItem, ResearchProgram


async def timeline_agent(program: ResearchProgram) -> ResearchProgram:
    timeline = [
        GanttItem(milestone="Context and literature synthesis", week_start=1, week_end=2, is_parallel=True),
        GanttItem(milestone="Protocol finalization", week_start=3, week_end=4, depends_on=["Context and literature synthesis"]),
        GanttItem(milestone="Pilot execution", week_start=5, week_end=7, depends_on=["Protocol finalization"]),
        GanttItem(milestone="Analysis and validation", week_start=8, week_end=10, is_parallel=True),
        GanttItem(milestone="Pre-IND package draft", week_start=11, week_end=12, depends_on=["Analysis and validation"]),
    ]
    program.timeline_weeks = timeline
    program.refresh_computed_fields()
    return program

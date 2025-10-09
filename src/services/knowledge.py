"""Service for loading the film production knowledge base."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List


class KnowledgeService:
    """Loads markdown snippets and exposes structured knowledge categories."""

    def __init__(self, *, base_path: str | Path | None = None) -> None:
        repo_root = Path(__file__).resolve().parents[2]
        knowledge_root = Path(base_path) if base_path else repo_root / "loop" / "knowledge"
        self.base_path = knowledge_root

    def _read_markdown(self, relative_path: str) -> str:
        file_path = self.base_path / relative_path
        if not file_path.exists():
            return ""
        return file_path.read_text(encoding="utf-8")

    @staticmethod
    def _extract_list_items(markdown: str) -> List[str]:
        items: List[str] = []
        for line in markdown.splitlines():
            stripped = line.strip()
            if stripped.startswith(("- ", "* ")):
                candidate = stripped[2:].split(":")[0].strip()
                if 0 < len(candidate) < 80:
                    items.append(candidate)
            elif stripped.startswith("## "):
                candidate = stripped[3:].strip()
                if 0 < len(candidate) < 80:
                    items.append(candidate)
        seen = []
        for item in items:
            if item not in seen:
                seen.append(item)
        return seen

    def load(self) -> Dict[str, Any]:
        files = {
            "cameraMovements": "camera_movement_notes.md",
            "filmTechniques": "film_techniques_notes.md",
            "storyStructures": "story_structures_notes.md",
            "sceneWritingTechniques": "scene_writing_and_opening_hooks.md",
            "screenplayArchetypes": "screenplay_conventions_and_archetypes.md",
            "screenwritingDay6": "screenwriting_day6_notes.md",
            "screenwritingLogline": "screenwriting_logline_plot_exposure_notes.md",
            "storyIdeaGeneration": "story_idea_generation_notes.md",
            "subtextNotes": "subtext_notes.md",
            "fracturedLoop": "fractured_loop_build_system_notes.md",
        }

        payload: Dict[str, Any] = {}
        full_context_parts: List[str] = ["# Film Production Knowledge Base\n"]

        for key, filename in files.items():
            markdown = self._read_markdown(filename)
            payload[key] = self._extract_list_items(markdown)
            title = filename.replace("_", " ").replace(".md", "").title()
            full_context_parts.append(f"## {title}\n{markdown}\n")

        payload["fullContext"] = "\n".join(full_context_parts).strip()
        return payload

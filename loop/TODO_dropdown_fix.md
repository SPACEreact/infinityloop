# Dropdown Options Fix Plan

## Information Gathered
- FIELD_OPTIONS in constants.ts has two structures:
  - Simple: { options: [...] } for keys like story_genres, shot_types
  - Nested: { resolution: [...], frame_rate: [...] } for keys like video_output, image_output
- Current getFieldOptions in Workspace.tsx has hardcoded mappings that are inconsistent and may not cover all FIELD_OPTIONS
- User feedback indicates current mapping doesn't match original FIELD_OPTIONS knowledge

## Plan
- Refactor getFieldOptions function in Workspace.tsx to dynamically and correctly access FIELD_OPTIONS
- Handle both "options" arrays and nested arrays consistently
- Ensure all dropdowns use correct options from FIELD_OPTIONS

## Dependent Files to Edit
- Fractured_loop_infinity-main/fractured-loop-v2 (1)/fractured-loop-v2/components/Workspace.tsx

## Followup Steps
- Test dropdowns in AssetDetailsPanel for correct options
- Verify UI behavior and consistency
- Confirm with user that mapping now matches expectations

## Tasks
- [ ] Refactor getFieldOptions function to properly map field keys to FIELD_OPTIONS
- [ ] Handle nested FIELD_OPTIONS structures (video_output, image_output, etc.)
- [ ] Test dropdown functionality in UI

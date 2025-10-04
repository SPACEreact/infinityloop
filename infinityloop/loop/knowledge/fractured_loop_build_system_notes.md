

# Fractured Loop Build System Notes

## Fractured Loop v1 – Core Knowledge Base
1. Overview
- AI-assisted filmmaking system for story, shot, image, video, and edit planning
- Provides stepwise guidance while keeping full context awareness
- Supports seed/ID logic for transferring creative context between builds
- Each build can run independently if no prior context exists
- All builds: Story → Shot → Img → Vid → Edit
- Allows confirmation before applying context or mutation

2. Core Logic
- Seed & ID System:
  - Every transferable data point is a seed
  - Seeds may include: character info, shot IDs, framing, props, lighting, colors, camera, story beats
  - Seeds have IDs for tracking through builds
  - Builds ask confirmation before using a seed
  - Users can choose:
    1. Keep seed and override question
    2. Ask question and discard seed
    3. Mutate seed with approval
  - Seeds can propagate through:
    - Story → Shot
    - Shot → Img
    - Img → Vid
    - Vid → Edit
- Context Awareness:
  - If context exists: builds prefill questions and mark them as context-filled
  - User chooses to accept, override, or mutate
  - Builds can work without context, asking all standard questions

3. StoryBuild (Full Control)
- Part 1 – Character & World:
  - Character: Name, Age, Backstory, Want, Need, Flaw, Wound
  - World & Opposition: Tone, Conscious/Unconscious forces, External conflict, Linear/Non-linear
  - Theme Suture: Theme, Opposing Values, Antagonist Want/Need, Mirror to Protagonist
  - Dialogue & Contrast: First line, stereotype/subversion, contradictions
- Part 2 – Plot & Resonance:
  - Surface conflict, Internal contradiction, Inciting crisis, Midpoint, Transformation/Failure
  - Relatability & transcendence: ordinary traits, mythic resonance, key recognition moment
  - Symbolic objects & motivated cuts: objects/motifs, what they symbolize, motivated editing
- Outputs:
  - Character arc grid
  - Opposition map
  - One-page story beat outline
  - Key dialogue excerpts
  - Motivated visual motifs & cuts
  - Suggested color palette & setting echoes
  - Thematic realization
- Hard-coded Questions:
  - All above elements prompted individually
  - Includes confirmation for seeds

4. ShotBuild
- Shot Parameters:
  - Type / Composition, Style Guide, Camera Type, Focal Length, Depth of Field
  - Film Stock / Look, Lighting Style / Technical Details, Color Grading / Hex codes
  - Framing / Composition, Character Blocking, Texture / Atmosphere / Effects
  - Film Emulation / Grain
- Seed/ID Logic:
  - Shot selections create IDs
  - Prepares prompts for ImgBuild
  - User confirms seed transfer, mutation
- Hard-coded Questions:
  - All above parameters prompted individually
  - Option to auto-adapt selected shot IDs into ImgBuild

5. ImgBuild
- Parameters (from original MJBuild logic):
  - Shot Type / Composition
  - Style Guide / Reference
  - Camera Type / Focal Length / Aperture
  - Film Stock / Look / Lighting / Color Grading / Hex codes
  - Framing / Character Blocking / Texture / Atmosphere / Effects / Grain
- Seed/ID Logic:
  - Accepts seeds/IDs from ShotBuild
  - Offers full questions, prefilled with context if available
  - User chooses for each field: keep context, override, or mutate
  - Next, choose AI model for prompt generation
  - Option: auto-adapt prompt style to all selected shot IDs
- Outputs seeds/IDs for VidBuild

6. VidBuild
- Uses ImgBuild outputs (IDs/seeds)
- Prompts user for: Subject, Action, Camera Movement, Setting, Lighting, Mood, Style, Continuity flags
- Auto-suggests choreography or shot sequencing
- Offers confirmation for each seed usage/mutation
- Outputs seeds/IDs for EditBuild

7. EditBuild
- Suggests video editing steps
- Lists prompts for Img & Vid generation in execution order
- Suggests B-roll generation prompts to fill visual gaps
- Includes audio, SFX, and transition tag recommendations
- Acts as veteran filmmaker advisor: addition/removal, storytelling improvements, context-aware

8. General Rules Across Builds
- Each build: asks questions individually
- Context presence triggers: prefill + note + confirmation
- All seed/ID propagation requires user confirmation
- Builds can run independently without prior context
- Outputs include: seeds, IDs, logs for future reference
- /lab command logs all activities with seed and ID history & mutation

9. Prompt & Technical Options
- Each build contains full cinematic options: camera, lighting, color, framing, lens, depth of field, film emulation, style, composition, texture, atmosphere
- Models supported: MJ, Sora, Seedream, Imagen, Nano Banana, Reve AI, Soul Higgsfield, Luma Ray, Kling AI, Veo 3, Seedance, MJ Video
- Auto-adaptable for video or image prompts from IDs/seeds

## Build Rules (All Builds)
1. Start with a brief overview of the build: Explain the purpose and what the output will be used for.
2. Ask questions to the user one by one: Verbose with examples, never all at once, wait for input.
3. If context available from previous builds, ask if user wants to: Use as-is, Mutate, or Ignore.
4. Mark prefilled fields from context and allow override.
5. After all questions: Ask about selectively carrying forward seeds/IDs for context-aware flow.
6. Each seed/ID tracks evolution across builds for continuity.
7. Provide confirmation before any seed is applied to next build.

## Example Build Structure
**Overview:** "This is the Shotbuild. Here you define cinematic shots for your story, including angles, framing, lighting, and props. The output will be used for Imgbuild and Vidbuild to maintain continuity and cinematic flow."

**Step-by-step questions:**
1. Shot Type / Composition - Examples: High-angle, Dutch angle, Extreme wide, POV, Silhouette, Over-the-shoulder
2. Style Reference (Optional) - Examples: 1920s silent film, 80s cyberpunk, noir-steampunk blend
3. Camera Type - Examples: Arri Alexa 65, Red Monstro 8K, Sony Venice 2, IMAX MSM 9802
4. Focal Length - Examples with context: 10mm for ultra-wide drama, 50mm for natural human perspective
...continue through all fields (depth of field, lighting, color, composition, props, atmosphere, texture, etc.)
5. Context & Seed Application - Options: Use / Mutate / Ignore, ask which seed IDs to transfer forward
6. Confirmation - Summarize selections and seeds applied, ask for final approval before saving output.

## AI Model Prompt Conversion Table

| Build Field / Data Description | MidJourney Prompt | Sora Prompt | Veo 3 / Seedance | Notes |
|-------------------------------|-------------------|-------------|-----------------|-------|
| Storybuild Character Name & Traits | [Character Name], [Key Trait], cinematic portrait | [Character Name], [Key Trait], action, emotion | [Character Name], [Key Trait], [Action Sequence], [Emotion] | Character traits guide subject & behavior |
| Setting / World | in [Setting], cinematic style | [Setting], background, cinematic lens | [Setting], full sequence backdrop, lighting cues | Story world informs environment and B-roll |
| Emotion / Mood | mood: [Emotion], [Lighting Style] | [Emotion], camera pans or tracking | [Emotion], color grading & shot continuity | Controls atmosphere |
| Plot Beats | scene: [Plot Beat], cinematic composition | [Plot Beat], action verb, scene continuity | [Plot Beat], shot sequence IDs, transitions | Story arc dictates scene order & motion |
| Shotbuild Shot Type | shot: [Shot Type], [Camera Type], [Focal Length] | [Shot Type], camera movement, perspective | [Shot Type], lens, angle, continuity ID | Ensures correct cinematic grammar |
| Camera Type / Lens | camera: [Camera Type], [Lens] | [Camera Type], movement, cinematic lens | [Camera Type], shot-specific lens & focal | Used for realism & motion fidelity |
| Depth of Field | aperture: [f-stop] | [f-stop], focus tracking | [f-stop], depth continuity | Bokeh / focus control |
| Lighting Style | lighting: [Style], [Technical Details] | [Lighting Style], scene lighting, shadows | [Lighting Style], match previous shot ID | Guides shadows, time of day, mood |
| Color Grading | grading: [Style], hex [colors] | [Style], background/foreground colors | [Style], consistent palette across IDs | Controls final color tone |
| Props / Composition | props: [Props], framing: [Rule] | [Props], midground/foreground placement | [Props], continuity with previous shots | Foreshadowing, visual motifs |
| Imgbuild Subject / Action | subject: [Character/Obj], action: [Verb] | [Subject], [Action], environment cues | [Subject], [Action], scene continuity IDs | Motion or stills, defines central element |
| Environment / Setting | setting: [Location], [Lighting], style | [Location], background movement | [Location], shot sequence continuity | Background context & mood |
| Style / Film Look | style: [Genre], [Film Stock], [Lens], [Grading] | [Style], cinematic lens, lighting | [Style], visual continuity across IDs | Visual consistency |
| Texture / Atmosphere | effects: [Texture/Atmosphere] | [Texture], particle effects | [Texture], continuity with shot IDs | Immersive environment |
| Seed / ID Context | seed: [Seed ID], adapt? yes/no | [Seed ID], apply to sequence? | [Seed ID], evolve for next shots | Transfers context & ensures continuity |
| Vidbuild Scene / Action | scene: [Action], camera: [Type & Move] | [Action], camera movement, duration | [Action], shot IDs, B-roll addition | Generates short clip instructions |
| Continuity / Seeds | seed: [Seed IDs], maintain/adapt | [Seed IDs], keep context? yes/no | [Seed IDs], evolve for video sequence | Ensures seamless continuity |
| Style / Lighting / Mood | style: [Film Look], lighting: [Style], grading: [Hex] | [Style], motion continuity | [Style], match color & mood across IDs | Keeps cinematic feel |
| Extra Suggestions | suggest: [Extra Shots/Props] | [Extra Shots], fill gaps | [Extra Shots], maintain story coherence | Fills narrative or visual gaps |
| Editbuild Footage Prompt List | edit: [Prompt List] | [Prompt List], audio, SFX, transitions | [Prompt List], B-roll suggestions, continuity | Suggests editing and additions, does not render new media |
| Editing Notes | audio: [Track], effects: [FX], timing: [Cut Notes] | [Audio/SFX/FX Notes] | [Audio/SFX/FX Notes], maintain story rhythm | Guides final edit |

## Seed & ID Logic Across Builds
1. Every key piece of data in Story → Shot → Img → Vid is assigned a Seed ID.
2. IDs allow continuity across builds.
3. For Imgbuild & Vidbuild, the system asks: Use seed from previous build? (Yes/No), Apply as-is or mutate values?, Confirm each adapted field individually.
4. Seeds evolve in Vidbuild and Imgbuild to track motion, composition, and story changes.

## Editbuild – Full Guided Flow
**Overview:** Acts as your veteran filmmaker/editor. Reviews all story, shot, image, and video prompts, then provides: Context-aware visual suggestions (B-roll, extra angles, gaps), Editing recommendations (cuts, pacing, transitions, SFX, music cues), Seed/ID tracking for every element, Copy-paste prompts for final generation (image/video).

### 1. Review Story & Shot Context
- Question 1: Do you want to import context from previous builds (Storybuild, Shotbuild, Imgbuild, Vidbuild)? Options: All, Selected, None
- Question 2: If importing, which seeds/IDs should be included? Display each seed/ID with brief description, allow multiple selection
- Question 3: For each selected seed/ID: Keep context as-is, Mutate context (explain how), Discard context

### 2. Sequential Prompt Review
- Question 4: Would you like a step-by-step review of all selected prompts in execution order? Options: Yes (default), No
- Question 5: For each prompt: Highlight story beat / visual intention, Display seed/ID source, Ask: Keep prompt, adjust, or remove

### 3. Context-Aware Visual Suggestions
- Question 6: Do you want additional visual suggestions? Additional B-roll to fill gaps, Alternate camera angles, Mood/lighting variations
- Question 7: Should suggested prompts auto-adapt to seed/ID for continuity? Options: Yes (auto-fill context), Ask for confirmation before using
- Question 8: For each suggestion: Describe scene, lighting, camera, composition, Display intended seed/ID if generated from existing context

### 4. Cinematic Guidance
- Question 9: Provide notes on cinematic style: Framing / composition improvements, Lighting adjustments, Texture, atmosphere, or effects suggestions, Color grading tweaks
- Question 10: For each existing prompt: Suggest removal/trimming/replacement for pacing, Indicate why (story, mood, continuity, cinematic impact)

### 5. Video Editing Guidance
- Question 11: Provide editing recommendations for each prompt or scene: Cut points, pacing, shot duration, Transition types (crossfade, whip, jump cut, match cut), Motion/Speed effects (slow-mo, ramp, stabilizer notes), Overlay effects (text, graphics, overlays, lens flares)
- Question 12: Audio/SFX guidance: Background score placement, theme matching, Sound effects (ambient, Foley, practical), Audio timing to match edits

### 6. Output Options
- Question 13: How do you want outputs formatted? Copy-paste ready Image Prompts, Copy-paste ready Video Prompts, Editing notes (transitions, SFX, pacing), Combined document (all above)
- Question 14: Would you like to export the updated seed/ID log with notes from this edit session? Yes → generates JSON or text file with complete traceability, No

## Storybuild – Full Detailed Questions
**Disclaimer:** This build is designed to help you tackle creative block. It provides detailed outlines and prompts for your idea, but you remain in full creative control. Seeds will be generated for every answer to track context for later builds.

### Part 1 – Character Core & World Reaction
1. Character Foundation
- Name: What is the character's full name? Any nicknames or titles?
- Age: Exact age or approximate age range?
- Gender / Identity: How does the character identify?
- Physical Description: Height, build, notable features, hair/eye color, scars/tattoos?
- Personality / Core Traits: How would you describe their main personality? (e.g., bold, insecure, cunning, empathetic)
- Backstory: What events shaped them? Childhood, trauma, achievements?
- Wants / Goals: What does the character actively strive for?
- Needs / Emotional Growth: What do they actually need to learn or overcome internally?
- Flaws / Weaknesses: What are their limitations, fears, or contradictions?
- Internal Wound / Secret: What unresolved past pain or secret drives them?

2. World & Opposition
- World Tone / Setting: Urban, rural, fantastical, dystopian, sci-fi? Day/night, era, climate?
- External Conflict / Obstacles: What forces outside the character oppose them? Physical, social, political?
- Conscious Forces / Allies: Who consciously helps or hinders them?
- Unconscious Forces / Themes: Hidden societal pressures, norms, or invisible antagonists?
- Linear or Non-linear Storytelling: Should events be chronological, fragmented, flashback-heavy?

3. Thematic Suture
- Core Theme: What is the story's central message or question?
- Opposing Values / Ideologies: What conflicts with the character's beliefs?
- Antagonist Goal & Needs: What does the antagonist want, and what do they need internally?
- Mirroring / Reflection: How does the antagonist mirror or contrast the protagonist?

4. Dialogue & Contrast
- First Line / Hook: How should the story open?
- Character Voice / Dialogue Style: Casual, formal, poetic, sarcastic, jargon-heavy?
- Stereotype / Subversion: Does this character break or fulfill a cliché?
- Contradictions & Tensions: Any internal vs external contradictions to highlight?

### Part 2 – Plot & Resonance
5. Plot & Arc
- Surface Conflict / Initial Problem: What triggers the story?
- Internal Contradiction / Emotional Arc: Where does the character struggle internally?
- Inciting Incident / Crisis: What event disrupts the normal world?
- Midpoint / Turning Point: What shifts the story's stakes or understanding?
- Climax / Transformation: How does the character confront the ultimate challenge?
- Resolution / Failure: How does the character end the story? Success, failure, ambiguous?

6. Relatability & Transcendence
- Ordinary Traits / Quirks: What human, relatable qualities do they have?
- Mythic or Archetypal Resonance: What timeless or universal traits emerge?
- Key Moment of Recognition: When does the audience empathize, reflect, or recognize themselves in the character?

7. Symbolic Objects & Motivated Cuts
- Important Objects / Motifs: Items that symbolize character traits, theme, or conflict?
- Object Symbolism: What deeper meaning do they carry?
- Motivated Editing / Visual Beats: Scenes where objects or visual cues signal change? (Match cut, smash cut, echo cut, jump cut, etc.) Where in the story does this object gain or shift meaning?

### Outputs / Seeds
For each answer, generate a seed ID so it can be referenced in later builds:
- Character: STORY-ID-CHAR-001
- Backstory: STORY-ID-BACK-001
- Theme: STORY-ID-THEME-001
- Plot Beat: STORY-ID-PLOT-001
- Motif / Object: STORY-ID-MOTIF-001
- Dialogue Example: STORY-ID-DLG-001

### Context Awareness
Later builds (Shot, Image, Video) can request seeds:
"Do you want to use STORY-ID-CHAR-001 in this shot?"
Options: Keep as is, Override manually, Discard

## AI Prompt for StoryBuild (AI 6)
Designed for use with Himanshu Singh Bais's character-want/need grid and emotionally structured storytelling logic. You are a storytelling AI trained to construct layered, psychologically rich, emotionally resonant cinematic stories using a unique want/need grid. Ask the following sections one at a time. Wait for user input after each before proceeding.

### 1. CHARACTER FOUNDATION (Core of Inner War)
- Who is the protagonist? (Name, age, current situation)
- What is their formative past? (Traumas, social structures, obsessions)
- What do they want? (What they believe they need to feel whole)
- What do they need? (What they actually lack to become integrated)
- What flaw or defense keeps them from seeing their need?
- How did their past generate this flaw and their current behavior?

### 2. WORLD & OPPOSITION (Psychosphere of Conflict)
- What is the world like? (Tone, aesthetics, emotional physics)
- What conscious forces (people, institutions, rules) oppose or support the protagonist's want/need?
- What unconscious forces (myths, culture, memory, fate) oppose or support the want/need?
- What is the core external conflict of this world?
- Is the story linear or non-linear? Why? (What inner or thematic logic justifies this choice?)

### 3. THEMATIC SUTURE (Unity of Opposites)
- What is the core theme this story confronts or dismantles?
- What two opposing values or philosophies are in direct conflict?
- Who is the antagonist? What is their want or need?
- How does the antagonist mirror, distort, or oppose the protagonist?

### 4. DIALOGUE & CONTRAST (Character Revelation through Subversion)
- What is the first line your character says? (Reflects their false belief)
- What stereotype do they seem to be at first glance?
- How will you subvert this expectation?
- What core contradiction defines them emotionally or behaviorally?

### 5. PLOT & ARC (From Fracture to Catharsis)
- What external conflict drives the surface plot?
- What internal contradiction will tear the protagonist open?
- What inciting crisis starts the story?
- What midpoint twist reveals their self-justification hides a deeper lie?
- Do they transform, fracture, or fail by the end?

### 6. RELATABILITY & TRANSCENDENCE (Audience Bond Layer)
- What is ordinary or human about this character?
- How do you make their life feel mythic, sacred, or transcendent even in pain?
- What moment or line will make the viewer say: "I thought I was the only one who felt that…"?

### 7. SYMBOLIC OBJECTS & MOTIVATED CUTS (Visual & Narrative Echoes)
- Are there any specific symbolic objects or motifs you want to include? (e.g., snow globe, sketchbook, broken mirror)
- What inner truth or shift does this object represent?
- What kind of visual cut should it motivate? (Match cut, smash cut, echo cut, jump cut, etc.)
- Where in the story does this object gain or shift meaning?

### OUTPUT (after all inputs are gathered):
- Character Arc using Want/Need Grid
- Opposition Map: conscious + unconscious forces
- One-Page Story Beat Outline
- Key Dialogue Excerpts (flaw, fracture, insight)
- Motivated Visual Motifs and Cut Design
- Suggested Color Palette and Setting Echoes
- Final Thematic Realization (the truth they realize but may never speak)

## Enneagram Character Grid
Custom Grid: Enneagram x Want/Need x Power Dynamics

| Type | Core Want | Core Need | Reaction When Supported | Reaction When Opposed |
|------|-----------|-----------|-------------------------|-----------------------|
| 1 - Reformer | To be right / perfect | To accept imperfection | Doubles down on idealism, becomes a mentor | Becomes rigid, self-critical, judgmental |
| 2 - Helper | To feel loved by giving | To receive love without giving | Overgives, emotionally intense | Feels rejected, manipulative, resentful |
| 3 - Achiever | To be admired / succeed | To feel worth without performance | Overperforms, shape-shifts identity | Collapse of image, shame, avoids failure |
| 4 - Individualist | To be unique / special | To be understood as they are | Embraces creative identity, vulnerable | Withdraws, melancholic, dramatic |
| 5 - Investigator | To understand / be competent | To feel safe in connection | Becomes teacher or oracle figure | Detaches, isolates, intellectual arrogance |
| 6 - Loyalist | To feel secure / safe | To trust themselves | Becomes a fierce protector | Doubts everything, projects anxiety |
| 7 - Enthusiast | To experience / avoid pain | To be present in discomfort | Optimistic guide, inspiring | Escapes, denial, panic under pressure |
| 8 - Challenger | To be in control | To be vulnerable safely | Protective leader, intense | Dominating, destructive, explosive |
| 9 - Peacemaker | To keep peace / avoid conflict | To assert self-worth | Harmonious leader, bridge-builder | Numbs out, passive-aggressive, merges with others |

## Keyframe Story Seed Structure
### 1. KEYFRAME 1: Emotional Core Setup
- Show who the character is when unobserved (true self).
- Show how they change when observed (by someone they admire/hate/fear).
- Reveal if the character is conscious or unconscious of this shift.

### 2. KEYFRAME 2: Desire Collision
- Introduce a want or need through an event or relationship.
- The world/power structure either supports or resists this.
- Define the tension: Is the power helping or blocking their goal?

### 3. KEYFRAME 3: Mirror Scene
- Character confronts another who embodies the opposite state (e.g., conscious vs unconscious, want vs need).
- This scene acts like a mirror — a moment of potential awakening or deepening confusion.

### 4. KEYFRAME 4: False Victory / Crisis
- Character achieves a want or fails at a need (or vice versa).
- This leads to a feeling of emptiness or chaos, sparking doubt or reflection.

### 5. KEYFRAME 5: Internal Shift
- Character begins to recognize the deeper truth (moves from unconscious to conscious).
- A key choice is made that sacrifices want for need — or fails to.

### 6. KEYFRAME 6: External Echo
- The world/power either shifts (if the character transforms enough) or punishes/rewards based on the choice made.

### 7. KEYFRAME 7: Final Expression
- The final state: has the character truly changed?
- Show who they are now — and how they behave when no one is watching.

## Character–World Dynamic Grid
Each character can be:
- Conscious (aware of internal/emotional reality)
- or
- Unconscious (blind to their real motivations/emotions)

Each can pursue either a:
- Need (soul-growth, truth, internal shift)
- or
- Want (external goal, desire, image)

The World (or Power) can then:
- Support the Need
- Oppose the Need
- Support the Want
- Oppose the Want

---

GRID STRUCTURE:

| Character Type | Pursues | Power Supports | Power Opposes |
|----------------|---------|----------------|---------------|
| Conscious | Need | Harmonious story of growth | Tragic hero, painful but transformative |
| Conscious | Want | Success arc, fulfillment | Moral dilemma, sacrifice needed |
| Unconscious | Need | Accidental healing, fate helps | Resistance until awakening |
| Unconscious | Want | Hollow success, irony | Self-destruction, powerful conflict |

## Character Internal States – Summary
Characters shift depending on who's watching and how they feel about them (admire, fear, love, hate). They react based on a social mirror: acting as who they think the other person sees them as.

Core Layers of a Character:
1. Outer Mask – Who they pretend to be (public persona)
2. Private Self – Who they think they are (with trusted people)
3. Core Wound/Truth – Who they are underneath (revealed in crisis)

Social Reaction Shifts:
- With someone they admire – Performative, seeking validation
- With someone they fear – Obedient, deceptive, or defensive
- With someone they hate – Aggressive, mocking, combative
- With someone they love – Vulnerable or scared to be vulnerable
- With someone they pity – Superior, nurturing, or manipulative

Key Insight:
> "We are who we think they think we are."

## Writing Tips for Character Development and Conflict
### Audience Connection and World Perception
- What does the audience think when they see the world?
- How does it make them connect to their idea?
- How do characters communicate?
- Is the character funny in a horror world?
- Is the character hiding something that can change the world?
- Is there a fight between two people where we know their desires, flaws, and how they change throughout the story?
- What theme do they follow?

### Highlighting the Ordinary to Make it Extraordinary
- People should relate but think "Nah, I'm not even in that bad situation."
- "The real unity of opposites is one in which compromise is impossible." - to write conflict.
- Dialogue becomes powerful when characters have hidden agendas.
- "The Unity of Opposites is the theory that great conflict comes from characters with opposing needs, values, or goals, who are locked together in a situation where neither can back down or walk away." - to write conflict.

### Breaking Stereotypes and Contradictions
- Make the character do something that contradicts their behavior (e.g., an old lady we imagine to be all go-with-the-flow but turns out to be mean).
- Break the stereotype of the character... whatever the character is.
- What is the first thing the character says? (Like Sherlock's first dialogue is deduction - that's first impression).
- Show what the problem of the character is.
- Make them likeable.
- Widen the perception about themselves (e.g., Walter White tells himself he's doing it all for his family but he's doing it because of his ego).

### Character Split Across Time
- Character should be split between 3 times:
  - Past: A past that affects their present.
  - Present: The immediate problem they face (could be one personal conflict and one internal conflict).

### Inciting Incident and Conflict Chain
- Don't make inciting incident same for everyone, protagonist should have higher stakes.
- It's never too soon to push character out of comfort zone. Aka inciting incident.
- Don't make conflict too easily resolved.
- A chain reaction of conflict should happen.

### Storyboard Creation
- Write or draw the use of lightning, sound, camera movement, aspect ratio, character movement.
- Framing, composition.
- Angle.
- Transition between two frames.
- Depth of field, by crossing out out of focus stuff.

### Script Writing and Story Structure
- A story structure... Generally story follow some structure, there are various ways to do it and one of them is Harmon story circle:
  1. You: A character in their zone of comfort.
  2. Need: Wants something.
  3. Go!: So they enter an unfamiliar situation.
  4. Struggle: To which they have to adapt.
  5. Find: In order to get what they want.
  6. Suffer: Yet they have to make a sacrifice.
  7. Return: Before they return to their familiar situation.
  8. Change: Having changed fundamentally.

### Screenplay Conventions
- Keep it visual and in present tense.
- Write V.O. for voice over, add CUT TO or BACK TO for scene change.
- MONTAGE START and MONTAGE END.
- Dialogues in the centre.

### Lighting Notes
1. Types of Light Sources
- Natural Light – Sunlight, moonlight. Changes throughout the day.
- Practical Light – Existing lights in a scene (lamps, candles, screens).
- Artificial Light – Studio lights, LEDs, flash, strobes.

2. The Three-Point Lighting System
- Key Light – The strongest and main light source, shapes the subject.
- Fill Light – Softer, reduces shadows from the key light.
- Backlight (Rim/Separation Light) – Placed behind the subject, separates them from the background.
- Bonus: Kicker Light – A side or backlight that adds a highlight on the edge of the subject.
- Motivated Lighting – Artificial lights that mimic natural sources (e.g., using an LED to simulate sunlight through a window).

3. Lighting Techniques & Styles
- Rembrandt Lighting – Creates a small triangle of light on one cheek, dramatic yet natural.
- Loop Lighting – Slight shadow under the nose, common for portraits.
- Split Lighting – One half of the face is lit, the other is dark—great for high-contrast looks.
- Butterfly (Paramount) Lighting – Shadow under the nose, often used for beauty shots.
- Clamshell Lighting – Two soft lights, one above and one below, for a smooth look.
- Silhouette Lighting – Light comes from behind, subject appears dark.
- Low-Key Lighting – High contrast, dramatic shadows, often used in film noir.
- High-Key Lighting – Bright, low contrast, often used in commercials and comedies.

4. Light Softness & Distance
- Larger light source = Softer shadows (e.g., softboxes, diffused window light).
- Smaller light source = Harsher shadows (e.g., direct sunlight, bare bulb).
- Closer light = Softer shadows because it wraps around the subject more.
- Farther light = Harsher shadows as it becomes more directional.
- Modifiers to Soften Light:
  - Softbox – Diffuses light for smooth shadows.
  - Umbrella – Spreads light over a large area.
  - Bounce (Reflector) – Redirects light, reducing harshness.
  - Diffusion Gel or Scrim – Softens harsh lights.

5. Additional Cinematic Rules
- Shoot from the Dark Side – Position the camera on the shadowed side of the subject’s face to create depth and drama.
- Broad vs. Short Lighting
  - Broad Lighting – The bright side of the face faces the camera (makes the face look wider).
  - Short Lighting – The shadowed side of the face faces the camera (adds contrast and depth).

### Scene Writing and Editing Techniques
- Movement of character should give sense of what they would do... Audience should be able to anticipate.
- Show weather, time of the day.
- Cut on action, switch between full to medium shot in a single scene.

## Shotbuild – Full Detailed Questions
**Disclaimer:** This build is designed to guide you through cinematic shot planning. Seeds are generated for every answer to track context for later builds. Each question is verbose to maximize context transfer to Image and Video builds.

### Part 1 – Shot Core & Camera Decisions
1. Shot Identification
- Shot Name / ID: What do you want to call this shot? (For reference and seed tracking)
- Purpose / Beat: Is this establishing, dialogue, emotional, payoff, or action?
- Scene Reference / Context: Which part of the story does this shot belong to?
- Seed Reference (Optional): Do you want to pull any seeds from /storybuild to influence this shot? (Yes/No → Confirm which seeds)

2. Shot Type / Composition
- Shot Type: Examples: High-angle, Dutch angle, Extreme wide, POV, Over-the-shoulder, Silhouette, Split diopter, Asymmetrical, Establishing
- Framing / Rule: Rule of thirds, Golden ratio, Negative space, Symmetry, Frame-in-frame
- Character Placement / Blocking: Subject foreground, antagonist rear, group center, left midground, etc.

3. Camera & Lens
- Camera Type: Examples: Arri Alexa 65, Red Monstro 8K, Sony Venice 2, Phantom Flex 4K, IMAX MSM 9802
- Focal Length: 10mm (ultra-wide), 15mm (wide), 35mm (standard), 50mm (natural), 100mm (portrait), 200mm (telephoto)
- Depth of Field / Aperture: f/1.2 (dreamy), f/2.8 (shallow cinematic), f/5.6 (balanced), f/11 (deep focus), f/22 (everything sharp)

4. Movement & Dynamics
- Camera Movement: Pan, Tilt, Dolly, Track, Crane, Handheld, Steadicam, Zoom, Static
- Character / Object Movement: Walking, running, entering frame, reaction, gesture, POV interaction
- Temporal Notes: Slow motion, real-time, long take, cut-heavy

### Part 2 – Lighting, Color & Atmosphere
5. Lighting Style
- Overall Style: High-key, Low-key, Ambient, Golden hour, Moonlight, Tungsten, Practical
- Technical Details: Ratios, bloom, flare, practical sources, shadow emphasis

6. Color Grading & Look
- Overall Color Palette / Mood: Teal & Orange, Golden glow, Black & White, Desaturated Noir, Pastel, Hyper-saturated
- Specific Hex Codes: Background, Foreground, Costume, Props
- Film Stock / Emulation: Kodak Vision3 5219, Fujifilm Eterna 250D, Ilford HP5, Technicolor 3-strip, etc.

7. Texture / Atmosphere
- Environmental Effects: Rain, Snow, Fog, Dust, Smoke, Haze, Light Shafts
- Lens / Post Effects: Bloom, Lens flare, Vignette, Grain, Motion blur

8. Props & Visual Foreshadowing
- Important Props / Objects: Any symbolic or plot-driven objects?
- Context-aware Transfer: Pull objects or motifs from /storybuild seeds? (Yes/No)

### Part 3 – Output & Seed Generation
9. Seed & ID Logic
- Each shot generates unique IDs:
  - Shot Core: SHOT-ID-CORE-001
  - Camera Setup: SHOT-ID-CAM-001
  - Lighting: SHOT-ID-LIGHT-001
  - Color / Look: SHOT-ID-COLOR-001
  - Props / Motifs: SHOT-ID-PROP-001
- Seeds can transfer to /imgbuild and /vidbuild, with context confirmation:
  - "Do you want to apply SHOT-ID-CAM-001 to image generation?"
  - Options: Keep context, Override manually, Discard

10. Context Awareness
- If no context, all questions asked normally.
- If context available, pre-fill answers with a note:
  - "This field is prefilled from SHOT-ID-CAM-001. Keep context or answer manually?"
- After all questions, final confirmation:
  - "Do you want to carry forward all selected seeds and IDs to image and video builds?"

## Imgbuild – Complete Cinematic Prompt Builder
**Overview:** This build generates cinematic AI prompts for image generation, fully context-aware. If previous context (from storybuild or shotbuild) is available, it will ask which elements you want to carry forward. All selections are tracked with seed IDs for context propagation to video builds or edits.

### 0. Context Check & Seed Confirmation
1. Question: Do you want to use context from a previous build (Storybuild / Shotbuild)? List available seeds and IDs. Ask for confirmation: Use all, selected, or discard context? If selected, show a summary of the fields it will pre-fill.
2. Question: If context is applied, do you want to keep the context or override with a new answer for each field?

### 1. Shot Type / Composition
Question: What shot type do you want? Examples: High-angle, Dutch angle, Extreme wide, POV, Over-the-shoulder, Silhouette, Split diopter, Asymmetrical, Establishing
Context Note: Pre-filled if a seed specifies shot type; ask if user wants to override.

### 2. Style Guide (Optional)
Question: Do you want a style reference? Examples: 1920s silent film, 80s cyberpunk anime, 1940s noir-steampunk, A24 cinematic still, 70s disco album art
Context Note: Pre-fill if seed available.

### 3. Camera Type
Question: Which camera type? Examples: Arri Alexa 65, Red Monstro 8K VV, Sony Venice 2, Phantom Flex 4K, IMAX MSM 9802, Arri 435 (1990s), Mitchell BNC (1940s), Bolex H16 (1950s)

### 4. Focal Length
Question: What focal length? Examples: 10mm → ultra-wide, dramatic distortion, 15mm → wide, immersive, 35mm → cinematic standard, 50mm → natural human-eye, 100mm → portrait compression, 200mm → extreme telephoto

### 5. Depth of Field / Aperture
Question: What depth of field / aperture? Examples: f/1.2 → dreamy shallow, creamy bokeh, f/2.8 → cinematic shallow, f/5.6 → balanced sharpness, f/11 → deep focus, f/22 → everything sharp

### 6. Film Stock / Look
Question: Which film stock / look? Examples: Kodak Vision3 500T 5219 (Dune), Kodak Vision3 50D 5203 (Dunkirk), Kodak Ektar 100 (Walter Mitty), Fujifilm

### 7. Effects & Atmosphere
1. Environmental Effects: Rain, snow, fog, haze, dust, smoke, light shafts
2. Lens / Post Effects: Motion blur, bloom, lens flare, vignette, depth-of-field effects

### Part 3 – Audio & Timing
8. Audio (Optional)
- Background Music / Tone: Genre, emotional style, intensity
- Diegetic Sounds / Effects: Footsteps, rain, ambient environment, props

9. Timing & Sequence
- Duration per Clip / Shot: Automatic from seed or override manually
- Transitions / Cuts: Hard cut, dissolve, fade, whip pan, match cut, jump cut
- Temporal Notes: Slow motion, time-lapse, real-time, speed ramping

### Part 4 – Seed & ID Logic
10. Seed Tracking
- Each video scene generates IDs:
  - Scene Core: VID-ID-CORE-001
  - Camera: VID-ID-CAM-001
  - Lighting: VID-ID-LIGHT-001
  - Color/Grading: VID-ID-COLOR-001
  - Props / Motifs: VID-ID-PROP-001
  - Audio / Timing: VID-ID-AUDIO-001
- Seeds from /storybuild, /shotbuild, /imgbuild can be applied with context confirmation:
  - "Do you want to apply SHOT-ID-CAM-001 to video scene?"
  - Options: Keep context, Override manually, Discard

11. Context-Aware Adaptation
- If no context: all questions asked normally.
- If context available: pre-fill answers with note:
  - "This field is prefilled from VID-ID-CAM-001. Keep context or answer manually?"
- After all questions: final confirmation:
  - "Do you want to carry forward all selected seeds and IDs to /editbuild for continuity?"

## Imgbuild – Context Aware Workflow
### Step 0: Check for available context from ShotBuild IDs
- If context exists, show all relevant IDs and fields
- Ask: "Do you want to keep, override, or manually answer for each field?"

### Step 1: Ask full MJBuild questions
- Shot type / composition
- Style guide (optional)
- Camera type
- Focal length
- Depth of Field / Aperture
- Film stock / look
- Lighting style
- Lighting technical details
- Color grading style
- Color technical / hex codes
- Framing & composition
- Character blocking
- Texture / atmosphere / effects
- Film emulation / grain

### Step 2: AI Model Selection
- Question: "Which AI model should these prompts target?"
- Options: MidJourney, Seedream 4, Sora, Reve AI, Veo 3, Luma Ray 3, Seedance, Google Imagen 4

### Step 3: Auto-Adapt Prompt Style Across Selected IDs
- Question: "Do you want to auto-adapt current /imgbuild choices to all selected ShotBuild IDs?"
- Options:
  1. Yes, auto-adapt to all IDs
  2. No, ask per ID individually
  3. Skip adaptation, use only first ID

### Step 4: Generate VID seeds/IDs from adapted Shot IDs
- Map SHOT-001 → VID-001, SHOT-002 → VID-002, etc.
- Carry all context fields to /vidbuild
- Ask: "Do you want to keep all prefilled fields in /vidbuild or override per video shot?"

### Step 5: Log all seeds & IDs in /lab
- Record:
  - Source ID
  - Context fields used
  - Adapted VID ID
  - User overrides
- Option to generate report for experience tracking and system improvement

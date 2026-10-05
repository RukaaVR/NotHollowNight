# Canva art manifest

Original artwork generated with Canva's image generator for Veilfall.
Design holding full-size pages: DAHXIp4SzXI ("Blank black game canvas").

## Region backdrops (pages 1–15) → public/art/bg/<id>.jpg
th MAHXIq4k9-A · lw MAHXIhS9iJY · mg MAHXIgKUo18 · gs MAHXIqZ2W-0 · dc MAHXItzoqoU · lc MAHXIq__z6k ·
af MAHXIvRWcXk · sa MAHXInRsY38 · tc MAHXIgAcx_E · br MAHXIjyqjQ4 · so MAHXIjMp5i8 · vg MAHXIhEhgX0 ·
he MAHXIinRpZM · ab MAHXIo68__s · eh MAHXIoCsS6I

## Sprites → public/art/sprites/<kind>/<id>.png (white background keyed out)

Bosses and the player sit one per page (pages 16+ of the design); enemies and NPCs four to a page,
in a 2×2 grid (top-left, top-right, bottom-left, bottom-right). `scripts/sprite-sheets.txt` maps each
page preview to the sprites on it. To rebuild the PNGs from the previews:

    scripts/cut-sprites.sh scripts/sprite-sheets.txt <dir with mcp-Canva-blob-*.png previews>
    python3 scripts/fill-holes.py 0.0015 public/art/sprites/boss/*.png public/art/sprites/enemy/*.png  # skip prism_mite

Facing: the player and enemies were painted facing right, bosses and NPCs facing left (Juno faces right).
`src/rendering/SpriteArt.ts` records this so sprites mirror correctly.
player MAHXI8IekU0

### Enemies
husk MAHXIybMryI
moth MAHXI8876dc
rootling MAHXI6CmWPg
thornback MAHXIxxLM_k
shade MAHXI276lxI
bark_knight MAHXI8HYnYM
puffcap MAHXI41gKrI
dropper MAHXIzrumhQ
capling MAHXIxEo9RM
bloatcap MAHXIxIcwr0
prism_mite MAHXI4uDegA
wisp MAHXI2pMG7I
geode MAHXI7gV7Po
sentry MAHXI-GTTS0
imp MAHXI8pEjDo
eel MAHXI2pXTvA
hound MAHXI9Hqcy8
drone MAHXI5lWmGY
brute MAHXI4JCfbw
spitter MAHXI1ZaKo8
ink_wraith MAHXI_3Wr2s
page_swarm MAHXIx6ZLbg
scribe MAHXI3K6rKg
acolyte MAHXI0wegEo
wretch MAHXI3WJdEI
lurker MAHXI9Q8cac
coralback MAHXI5-zVZ4
sentinel MAHXI4l_HE4
orrery_knight MAHXI2nghLI
maiden MAHXI9R4ql0
topiary MAHXIyHj7Zs
gearwarden MAHXI1GJEFk
arc_node MAHXI2Tqk0A
maw MAHXI4JiWz8
dream_eater MAHXIzzi7qY

### Bosses
gatekeeper MAHXIy087PU
weeping_root MAHXI0r1jZ4
mycelia MAHXIwAJ-VY
prism MAHXIwIdXOM
bell_warden MAHXI-6sgSo
ash_warden MAHXI1EIjx0
archivist MAHXIykUgoA
thorn_saint MAHXI0hv1nQ
ormund MAHXIwqglng
astronomer MAHXI5pESDI
crown MAHXIzjzK0c
conductor MAHXI8FF8wY
gloam MAHXI-1FjXg
first_wanderer MAHXI1L7_gI

### NPCs
old_wick MAHXI5f1nDk
marrow MAHXI2vx-C0
tamsin MAHXI4gffz0
rhoswen MAHXIwM9DdU
quenna MAHXI-SBx60
corvane MAHXIyB8tu4
kettle MAHXIxsiOzc
oriel MAHXI24iwM4
ossian MAHXI9Vt89A
pell MAHXI1Jxbq0
dorran MAHXI60a_aA
ilka MAHXI9xKWV8
castor MAHXI53NZ2o
hush MAHXIz7VrBQ
seraphel_echo MAHXIxQKV4Q
hollis MAHXIxbrVk0
mourner MAHXI3M4fuQ
ysolde MAHXI4m-6g8
flicker MAHXIxT0IDM
ambrose MAHXIxKW5Bg
ottoline MAHXIwq3dao
gristle MAHXI3V27Ug
leaflet MAHXI3XTg9Q
maudlin MAHXIy2xFCI
calder MAHXI4KcGK8
juno MAHXI1sk1CU
fen MAHXIwGiybI
unit9 MAHXI4Up7lE

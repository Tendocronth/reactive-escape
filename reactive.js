// reactive.js
Hooks.once("ready", () => {
  let moveTimers = {};

  Hooks.on("updateToken", async (tokenDoc, updateData) => {
    if (!game.combat) return;
    if (!("x" in updateData || "y" in updateData)) return;

    const tokenId = tokenDoc.id;

    // Debounce for smoother detection
    if (moveTimers[tokenId]) clearTimeout(moveTimers[tokenId]);

    moveTimers[tokenId] = setTimeout(async () => {
      const movedToken = canvas.tokens.get(tokenId);
      if (!movedToken || !movedToken.actor) return;

      const movedActor = movedToken.actor;
      const movedDex = movedActor.system.abilities.dex.value ?? 10;

      const previouslyAdjacent = canvas.tokens.placeables.filter(t => {
        if (!t.actor || t.id === movedToken.id || t.document.disposition === movedToken.document.disposition) return false;

        const beforeDistance = MidiQOL.getDistanceSimple(t.center, {
          x: tokenDoc._previous?.x ?? tokenDoc.x,
          y: tokenDoc._previous?.y ?? tokenDoc.y
        });

        return beforeDistance <= 5;
      });

      for (const other of previouslyAdjacent) {
        const afterDistance = MidiQOL.getDistance(movedToken, other);
        if (afterDistance > 5) {
          const otherWis = other.actor.system.abilities.wis.value ?? 10;
          const result = movedDex > otherWis ? "evades" : "triggers";

          ChatMessage.create({
            content: `
              <b>Reactive Escape Triggered</b><br>
              ${movedToken.name} (DEX: ${movedDex}) moved away from ${other.name} (WIS: ${otherWis})<br>
              ➤ <b>${movedToken.name} ${result}</b> an opportunity attack.
            `,
            whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id)
          });
        }
      }
    }, 250);
  });
});

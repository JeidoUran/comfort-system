Hooks.once("init", () => {
    game.settings.register("comfort-system", "bastionSceneId", {
        name: "COMFORT.Settings.SceneID.Name",
        hint: "COMFORT.Settings.SceneID.Hint",
      scope: "world",
      config: true,
      type: String,
      default: "qXdo5DrAz6c6R1Ih"
    });
    game.settings.register("comfort-system", "consumeOnPlace", {
        name: "COMFORT.Settings.ConsumeOnPlace.Name",
        hint: "COMFORT.Settings.ConsumeOnPlace.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });
  });
  
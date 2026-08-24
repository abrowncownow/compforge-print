# Set 18 preview research and launch gates

Last reviewed: 2026-08-23 (America/Los_Angeles)

## Product boundary

CompForge Print is a pre-game, static reference product. It lets a visitor choose original editorial build sheets and print or save them as a PDF. It does not inspect a player's account, provide an in-game overlay, prescribe real-time decisions, or claim Riot endorsement.

## Set 18 preview state

Riot's Enchanted Wilds overview is the editorial source for the initial trait and champion concepts. Patch 18.1 is scheduled for August 26, 2026. The public CommunityDragon PBE TFT snapshot is incomplete during the Unreal transition: the sync on August 23 found eight base components, all 36 core item recipes, but only two translated playable Set 18 units. The site therefore:

- labels every build as an editorial PBE preview;
- makes no tier, win-rate, pick-rate, or statistical BiS claim;
- records source URLs, version labels, timestamps, and SHA-256 checksums;
- fails the sync when core recipes or requested assets are missing;
- keeps an `incomplete-preview` status until the expected roster validates.

## Riot product gates

Riot's developer policy says products serving players must be registered, even when they do not use an API key. Monetization requires the appropriate Approved or Acknowledged status and must still comply with Riot's monetization rules. The operator must control Developer Portal authentication and submission; credentials do not belong in this repository.

Before public promotion:

1. Deploy the free, disclaimer-complete preview.
2. Register the product in the Riot Developer Portal with its public URL and accurate static-reference description.
3. Keep monetization off until the required status is granted.
4. Re-run the data sync after patch 18.1, validate the full roster, and editorially review all build sheets.
5. Test Letter, A4, color, ink-saver, multi-build, and item-matrix PDF output on the deployment.

The Pages workflow will build but will not deploy until repository variables `RIOT_PRODUCT_REGISTERED` and `PRINT_QA_APPROVED` are both set to `true`.

## Primary sources

- [Riot TFT developer documentation](https://developer.riotgames.com/docs/tft)
- [Riot general developer policies](https://developer.riotgames.com/policies/general)
- [Riot Legal Jibber Jabber](https://www.riotgames.com/en/legal)
- [Riot Enchanted Wilds overview](https://teamfighttactics.leagueoflegends.com/en-sg/news/game-updates/enchanted-wilds-overview/)
- [Riot TFT Unreal migration FAQ](https://teamfighttactics.leagueoflegends.com/en-au/news/game-updates/faq-tft-unreal-migration/)
- [CommunityDragon asset documentation](https://github.com/CommunityDragon/Docs/blob/master/assets.md)

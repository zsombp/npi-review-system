/* strings.js, v0.2.0, 2026-09-26 (v0.1.0 the same day; v0.2.0 adds the 9:16 line breaks). Every word the intro video shows, in Hungarian and English, from one
   timeline. Nothing here is new copy: each on-screen line is the website's own
   (platform/website/content/{hu,en}/pages/*.json, docs/design/lab/website-2026-09-25/shared/copy-hu.md),
   and every interface word is the product's own (platform/web/src, the addStrings blocks of
   HomeCards.tsx, Overview.tsx, Drafts.tsx, lib/i18n.ts; the daily report of
   supabase/functions/_shared/strings.ts). Sources are named next to each group below.
   All example data is fictional: Példa Bisztró, Minta Étterem, Teszt Kávézó and their guests, the
   numbers of the App Pop lab (docs/design/lab/app-pop-2026-09-26/js/app.js, MA.yday), which add up:
   yesterday 8 new reviews, 3 + 3 + 2, average 31 / 8 = 3,88, two unanswered 2-star reviews, six replies
   waiting. No price, no customer count, no result, no named reference, no third-party logo. */
window.BT_STR = {
  hu: {
    lang: "hu",
    /* S1, website home hero h1 (hero.h1 lines) */
    s1: [["Minden"], ["értékelés."], ["Egy", { mk: "helyen." }]],
    example: "Példa",
    /* S2, website home hero report sticker (hero.report_sticker) */
    s2: [["Minden", "reggel"], ["egy", { hl: "jelentés." }]],
    /* S3, website home, morning card "Ma" (morning.cards[0].text, first sentence) */
    s3: [["Egy", "mondatban"], ["megmondja,"], ["mi", "a", { mk: "teendő." }]],
    /* S4, website home, morning card "Válaszok" (morning.cards[1].text, second sentence), one beat per action */
    s4: [["Elolvasod,"], ["ha", "kell,"], ["átírod,"], [{ hl: "jóváhagyod." }]],
    /* S4 sticker, website home try-it sticker (tryit.sticker) */
    s4sticker: "Minden választ te hagysz jóvá.",
    /* S5, the product's own greeting when nothing is waiting (home.head.quiet "Ma [nincs] teendőd.") */
    s5: [["Ma", { hl: "nincs" }], ["teendőd."]],
    /* S6, website groups page (hero.lead, first sentence) and its title as a sticker */
    s6: [["Több", "étterem", "egy", "fiókban,"], ["egymás", { mk: "mellett." }]],
    s6sticker: "Csoportoknak",
    /* the 9:16 cut breaks two lines differently (same words, same order, same timing) */
    v: {
      s4: [["Elolvasod,"], ["ha", "kell,", "átírod,"], [{ hl: "jóváhagyod." }]],
      s6: [["Több", "étterem"], ["egy", "fiókban,"], ["egymás", { mk: "mellett." }]]
    },
    /* S7, website footer line (strings.footer.line) and the caption rule of every website mock */
    s7: "Értékeléskezelés éttermeknek.",
    caption: "Illusztráció. Az éttermek, a vendégek, a szövegek és a számok kitaláltak.",

    /* S1 review cards: the website marquee's example reviews (marquee.snippets) and the App Pop lab's
       band; the first eight are yesterday's eight on Google, the last two come in from Tripadvisor. */
    reviews: [
      { venue: "Példa Bisztró", stars: 2, text: "„A leves langyos volt, és húsz percet vártunk a számlára.”", who: "Minta Katalin", src: "Google", c: "white" },
      { venue: "Példa Bisztró", stars: 5, text: "„Isteni volt a rántott csirke, és gyorsan kihozták.”", who: "Teszt Anna", src: "Google", c: "cyan" },
      { venue: "Minta Étterem", stars: 3, text: "„Rendben volt minden, csak hangos a zene.”", who: "Teszt Bence", src: "Google", c: "white" },
      { venue: "Teszt Kávézó", stars: 5, text: "Csak csillagozás, szöveg nélkül.", quiet: true, who: "Teszt Márk", src: "Google", c: "lilac" },
      { venue: "Teszt Kávézó", stars: 4, text: "„Jó a kávé. A sütit legközelebb melegebben kérném.”", who: "Minta Dóra", src: "Google", c: "white" },
      { venue: "Minta Étterem", stars: 2, text: "„Húsz percet vártunk az asztalra, pedig foglaltunk.”", who: "Példa Gergő", src: "Google", c: "pink" },
      { venue: "Minta Étterem", stars: 5, text: "„Kedves kiszolgálás, a gyerekeknek is volt menü.”", who: "Példa Réka", src: "Google", c: "white" },
      { venue: "Példa Bisztró", stars: 5, text: "„Lovely goulash and very friendly staff.”", lang: "en", who: "Teszt Emma", src: "Google", c: "green" },
      { venue: "Minta Étterem", stars: 4, text: "„Gutes Essen, aber etwas laut.”", lang: "de", who: "Minta Lili", src: "Tripadvisor", c: "orange" },
      { venue: "Példa Bisztró", stars: 5, text: "„Nagyon finom volt a gulyás, és gyorsan kihozták.”", who: "Minta Ágnes", src: "Tripadvisor", c: "white" }
    ],

    /* S2 the daily report, the structure of the website mock (content/hu/report.json) and the product's
       words (daily.title, daily.new, daily.average, daily.total, daily.unanswered) */
    report: {
      title: "BISTROTECH NAPI JELENTÉS",
      date: "2026. szept. 26., szombat",
      venues: [
        { name: "Példa Bisztró", line: "<b>3</b> új · átlag <b>4,00</b>", stars: [2, 0, 0, 1, 0], google: "Google: 4,6 (1284)", neg: true },
        { name: "Minta Étterem", line: "<b>3</b> új · átlag <b>3,33</b>", stars: [1, 0, 1, 1, 0], google: "Google: 4,4 (612)", neg: true },
        { name: "Teszt Kávézó", line: "<b>2</b> új · átlag <b>4,50</b>", stars: [1, 1, 0, 0, 0], google: "Google: 4,7 (238)", neg: false }
      ],
      total: "Σ Összesen: 8 új értékelés",
      totalStars: [4, 1, 1, 2, 0],
      unanswered: "Megválaszolatlan negatívok",
      unansweredN: "2",
      un: [
        { line: "Példa Bisztró · 2", date: "szept. 25.", quote: "„A leves langyos volt, és húsz percet vártunk a számlára.”" },
        { line: "Minta Étterem · 2", date: "szept. 25.", quote: "„Húsz percet vártunk az asztalra, pedig foglaltunk.”" }
      ],
      time: "7:45"
    },

    /* S3 the app, Ma (HomeCards.tsx, Overview.tsx, lib/i18n.ts nav, the App Pop lab's Ma screen) */
    app: {
      tenant: "Példa Bisztró Csoport",
      menu: "Menü",
      date: "szept. 26., szombat",
      hello: "Jó reggelt.",
      headA: "Ma ", headHl: "6 válasz", headB: " vár rád.",
      why: "Elsőként: tegnapi 2 csillagos értékelés",
      nextTitle: "2 csillag, Példa Bisztró",
      nextBody: "A leves langyos volt, és húsz percet vártunk a számlára.",
      nextMeta: "Minta Katalin · tegnap 12:40 · magyar",
      nextReady: " · a válasz kész, csak rá kell nézned",
      nextGo: "Válasz átnézése",
      nextMore: "Még 5 válasz vár rád.",
      bandTag: "8 új",
      bandLabel: "Ezek érkeztek tegnap, minden étteremből.",
      tabs: ["Ma", "Értékelések", "Válaszok", "Kimutatások"],
      period: "Tegnap", periodDate: "szept. 25., péntek",
      tiles: [["8", "Új értékelés"], ["3,88", "Új értékelések átlaga"], ["2", "Megválaszolatlan 1 és 2 csillagos"]],
      stars: "csillag"
    },

    /* S4 the queue (Drafts.tsx; the replies are the App Pop lab's q-data 0 and 1, the rewrite the
       website's try-it "Melegebb" variant) */
    queue: {
      of: "/ 6", ofWord: "/",
      label: "A válasz",
      google: "Megnyitás a Google-on",
      rewrite: "Átírás",
      chips: ["Rövidebb", "Melegebb", "Határozottabb", "Magázó", "Tegező"],
      approve: "Jóváhagyás",
      skip: "Nem válaszolok",
      stamp: "Jóváhagyva",
      toast: "Jóváhagyva.",
      undo: "Visszavonom",
      cards: [
        {
          venue: "Példa Bisztró", stars: 2, meta: "Minta Katalin · tegnap 12:40 · magyar",
          review: "A leves langyos volt, és húsz percet vártunk a számlára.",
          draft: "Kedves Katalin, köszönjük, hogy megírta. Sajnáljuk, hogy langyos volt a leves, és sokat kellett várnia a számlára. Továbbadtuk a konyhának és a felszolgálóknak. Reméljük, visszatér, és akkor minden a helyén lesz.\nA Példa Bisztró csapata",
          warmer: "Kedves Katalin, nagyon köszönjük, hogy időt szánt ránk. Bosszant minket, hogy langyos volt a leves, és hogy ennyit kellett várnia a számlára. Továbbadtuk a konyhának és a felszolgálóknak. Szeretnénk, ha legközelebb jó szívvel állna fel az asztaltól.\nA Példa Bisztró csapata"
        },
        {
          venue: "Minta Étterem", stars: 2, meta: "Példa Gergő · tegnap 19:15 · magyar",
          review: "Húsz percet vártunk az asztalra, pedig foglaltunk.",
          draft: "Kedves Gergő, köszönjük, hogy szólt. Sajnáljuk, hogy a foglalás ellenére húsz percet kellett várniuk az asztalra. Megnézzük, hol csúszott el a foglalás, és továbbadtuk a csapatnak.\nA Minta Étterem csapata"
        }
      ]
    },

    /* S5 done (Drafts.tsx drafts.done.stamp) */
    done: "kész",

    /* S6 per venue, yesterday (the report's numbers again; Overview.tsx words) */
    venues: [
      { name: "Példa Bisztró", n: "3", nw: "új", avg: "átlag 4,00", google: "Google: 4,6 (1284)", st: [2, 0, 0, 1, 0], c: "yellow" },
      { name: "Minta Étterem", n: "3", nw: "új", avg: "átlag 3,33", google: "Google: 4,4 (612)", st: [1, 0, 1, 1, 0], c: "cyan" },
      { name: "Teszt Kávézó", n: "2", nw: "új", avg: "átlag 4,50", google: "Google: 4,7 (238)", st: [1, 1, 0, 0, 0], c: "lilac" }
    ],
    venuesDay: "Tegnap, szept. 25."
  },

  en: {
    lang: "en",
    /* S1, website home hero h1 (en) */
    s1: [["Every"], ["review."], ["One", { mk: "place." }]],
    example: "Example",
    /* S2, website hero report sticker (en) */
    s2: [["One", "report"], ["every", { hl: "morning." }]],
    /* S3, website morning card "Today" (en), first sentence */
    s3: [["One", "sentence"], ["tells", "you", "what"], ["needs", { mk: "doing." }]],
    /* S4, website morning card "Replies" (en), second sentence */
    s4: [["You", "read", "it,"], ["rewrite", "it"], ["if", "you", "need", "to,"], ["and", { hl: "approve" }, "it."]],
    s4sticker: "You approve every reply.",
    /* S5, the product's greeting (home.head.quiet en "[Nothing] needs you today.") */
    s5: [[{ hl: "Nothing" }], ["needs", "you"], ["today."]],
    /* S6, website For groups (en) */
    s6: [["Several", "venues", "in", "one", "account,"], ["side", "by", { mk: "side." }]],
    s6sticker: "For groups",
    v: {
      s6: [["Several", "venues"], ["in", "one", "account,"], ["side", "by", { mk: "side." }]],
      s7break: 2
    },
    /* S7, website footer line (en) */
    s7: "Review management for restaurants.",
    caption: "Illustration. The venues, the guests, the texts and the numbers are made up.",

    /* S1 review cards: the website's English marquee (en/pages/home.json); names stay as they are, the
       German stays German, the last one translated the way the English site translates the rest */
    reviews: [
      { venue: "Példa Bisztró", stars: 2, text: "“The soup was lukewarm, and we waited twenty minutes for the bill.”", who: "Minta Katalin", src: "Google", c: "white" },
      { venue: "Példa Bisztró", stars: 5, text: "“The fried chicken was divine, and it came out fast.”", who: "Teszt Anna", src: "Google", c: "cyan" },
      { venue: "Minta Étterem", stars: 3, text: "“Everything was fine, only the music is loud.”", who: "Teszt Bence", src: "Google", c: "white" },
      { venue: "Teszt Kávézó", stars: 5, text: "Rating only, no text.", quiet: true, who: "Teszt Márk", src: "Google", c: "lilac" },
      { venue: "Teszt Kávézó", stars: 4, text: "“Good coffee. Next time I'd like the cake warmer.”", who: "Minta Dóra", src: "Google", c: "white" },
      { venue: "Minta Étterem", stars: 2, text: "“We waited twenty minutes for our table, and we had booked.”", who: "Példa Gergő", src: "Google", c: "pink" },
      { venue: "Minta Étterem", stars: 5, text: "“Kind service, and there was a children's menu too.”", who: "Példa Réka", src: "Google", c: "white" },
      { venue: "Példa Bisztró", stars: 5, text: "“Lovely goulash and very friendly staff.”", who: "Teszt Emma", src: "Google", c: "green" },
      { venue: "Minta Étterem", stars: 4, text: "“Gutes Essen, aber etwas laut.”", lang: "de", who: "Minta Lili", src: "Tripadvisor", c: "orange" },
      { venue: "Példa Bisztró", stars: 5, text: "“The goulash was delicious, and it came out fast.”", who: "Minta Ágnes", src: "Tripadvisor", c: "white" }
    ],

    /* S2 the report in English (daily.title, daily.new, daily.average, daily.total, daily.unanswered, en) */
    report: {
      title: "BISTROTECH DAILY REPORT",
      date: "26 Sep 2026, Saturday",
      venues: [
        { name: "Példa Bisztró", line: "<b>3</b> new · average <b>4.00</b>", stars: [2, 0, 0, 1, 0], google: "Google: 4.6 (1,284)", neg: true },
        { name: "Minta Étterem", line: "<b>3</b> new · average <b>3.33</b>", stars: [1, 0, 1, 1, 0], google: "Google: 4.4 (612)", neg: true },
        { name: "Teszt Kávézó", line: "<b>2</b> new · average <b>4.50</b>", stars: [1, 1, 0, 0, 0], google: "Google: 4.7 (238)", neg: false }
      ],
      total: "Σ Total: 8 new reviews",
      totalStars: [4, 1, 1, 2, 0],
      unanswered: "Unanswered negatives",
      unansweredN: "2",
      un: [
        { line: "Példa Bisztró · 2", date: "25 Sep", quote: "“The soup was lukewarm, and we waited twenty minutes for the bill.”" },
        { line: "Minta Étterem · 2", date: "25 Sep", quote: "“We waited twenty minutes for our table, and we had booked.”" }
      ],
      time: "07:45"
    },

    /* S3 the app in English (HomeCards.tsx en, Overview.tsx en, lib/i18n.ts en) */
    app: {
      tenant: "Példa Bisztró Csoport",
      menu: "Menu",
      date: "Saturday, 26 Sep",
      hello: "Good morning.",
      headA: "", headHl: "6 replies", headB: " need you today.",
      why: "First: yesterday's 2-star review",
      nextTitle: "2 stars, Példa Bisztró",
      nextBody: "The soup was lukewarm, and we waited twenty minutes for the bill.",
      nextMeta: "Minta Katalin · yesterday 12:40 · English",
      nextReady: " · the reply is ready, it only needs your eyes",
      nextGo: "Review reply",
      nextMore: "5 more replies need you.",
      bandTag: "8 new",
      bandLabel: "These arrived yesterday, from every venue.",
      tabs: ["Today", "Reviews", "Replies", "Analysis"],
      period: "Yesterday", periodDate: "Friday, 25 Sep",
      tiles: [["8", "New reviews"], ["3.88", "Average of new reviews"], ["2", "Unanswered 1-star and 2-star"]],
      stars: "stars"
    },

    /* S4 the queue in English (Drafts.tsx en); the reply is the website's English try-it reply and its
       "Warmer" variant; the second reply follows the same English */
    queue: {
      of: "of 6", ofWord: "of",
      label: "The reply",
      google: "Open on Google",
      rewrite: "Rewrite",
      chips: ["Shorter", "Warmer", "Firmer", "Formal", "Informal"],
      approve: "Approve",
      skip: "No reply",
      stamp: "Approved",
      toast: "Approved.",
      undo: "Undo",
      cards: [
        {
          venue: "Példa Bisztró", stars: 2, meta: "Minta Katalin · yesterday 12:40 · English",
          review: "The soup was lukewarm, and we waited twenty minutes for the bill.",
          draft: "Dear Katalin, thank you for writing to us. We are sorry the soup was lukewarm and that you had to wait so long for the bill. We have passed this on to the kitchen and the waiting staff. We hope you will come back, and then everything will be as it should be.\nThe Példa Bisztró team",
          warmer: "Dear Katalin, thank you so much for taking the time to write to us. It bothers us that the soup was lukewarm and that you had to wait so long for the bill. We have passed this on to the kitchen and the waiting staff. Next time we would like you to leave the table happy.\nThe Példa Bisztró team"
        },
        {
          venue: "Minta Étterem", stars: 2, meta: "Példa Gergő · yesterday 19:15 · English",
          review: "We waited twenty minutes for our table, and we had booked.",
          draft: "Dear Gergő, thank you for telling us. We are sorry you had to wait twenty minutes for your table even though you had booked. We will look at where the booking went wrong, and we have passed it on to the team.\nThe Minta Étterem team"
        }
      ]
    },

    done: "done",

    venues: [
      { name: "Példa Bisztró", n: "3", nw: "new", avg: "average 4.00", google: "Google: 4.6 (1,284)", st: [2, 0, 0, 1, 0], c: "yellow" },
      { name: "Minta Étterem", n: "3", nw: "new", avg: "average 3.33", google: "Google: 4.4 (612)", st: [1, 0, 1, 1, 0], c: "cyan" },
      { name: "Teszt Kávézó", n: "2", nw: "new", avg: "average 4.50", google: "Google: 4.7 (238)", st: [1, 1, 0, 0, 0], c: "lilac" }
    ],
    venuesDay: "Yesterday, 25 Sep"
  }
};

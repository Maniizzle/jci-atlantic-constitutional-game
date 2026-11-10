// Answers live only on the server. Do not import this file into site/.
export const STAGES = ["Applicant","Intending Member","Member","Director","Vice President","President"];

// s = stage index; choices: ok:true for the right one, otherwise fail + why
export const SCENES = [
 {
  "s": 0,
  "title": "The application",
  "text": "It's 10 February. You've been to a few JCI Atlantic events and you're hooked. You want to be inducted this September. How do you apply?",
  "choices": [
   {
    "t": "Email your application to the President through the Director of HR & Welfare, with your birth certificate and a reference letter from a member in good standing.",
    "ok": true
   },
   {
    "t": "Turn up at the next General Assembly, pay 30,000 naira cash and ask to be inducted on the spot.",
    "fail": "Politely escorted to the refreshments table",
    "why": "Applications go in writing by email, through the Director of HR & Welfare, before 20 February. There's no walk-in induction."
   },
   {
    "t": "Ask your friend who's a member to add you to the WhatsApp group. That makes it official.",
    "fail": "Added to the group. Still not a member.",
    "why": "Membership starts with a written application and a reference letter. The Board then votes on it."
   }
  ],
  "win": "Applications for September close on 20 February, and the Board accepts them by majority vote. You'll get an acceptance letter by the first weekend in March.",
  "art": "Bylaw 6-3"
 },
 {
  "s": 1,
  "title": "Probation plan",
  "text": "You're accepted as an intending member. Probation lasts at least six months. Which plan gets you to induction?",
  "choices": [
   {
    "t": "Go to every project, but skip the intending members training. Projects count more.",
    "fail": "Automatically disqualified",
    "why": "Taking part in activities but neglecting the intending members training (or the other way round) is an automatic disqualification for induction."
   },
   {
    "t": "Attend 3 General Assemblies, 2 projects, 1 JCI Nigeria event in Lagos, the intending members training, and pay 30,000 naira dues before induction.",
    "ok": true
   },
   {
    "t": "Attend one General Assembly and make a big donation instead.",
    "fail": "Thanked warmly. Not inducted.",
    "why": "The probation checklist is fixed: three General Assemblies, two projects, a JCI Nigeria event, the training, and dues."
   }
  ],
  "win": "After the intending members interview (with your 5-year plan), the Board confirms who gets inducted in the first week of September.",
  "art": "Bylaw 6-4"
 },
 {
  "s": 1,
  "title": "Induction night",
  "text": "It's September and you're at the front of the room. The President asks you to recite the JCI Creed.",
  "choices": [
   {
    "t": "Read it from your phone. Nobody memorizes these things.",
    "fail": "The whole room recites it for you, slowly",
    "why": "Intending members recite the Creed off hand at induction."
   },
   {
    "t": "Recite it from memory, then take the oath.",
    "ok": true
   },
   {
    "t": "Ask to skip the Creed and go straight to the lapel pin.",
    "fail": "No pin for you tonight",
    "why": "The Creed comes first, then the oath, then the lapel pin, certificate and a copy of the constitution."
   }
  ],
  "win": "You recite the Creed, take the oath, and the President pins your JCI lapel pin. Welcome to JCI Atlantic.",
  "art": "Article 6-5"
 },
 {
  "s": 2,
  "title": "Your first AGM",
  "text": "It's the November Annual General Meeting, your first as a full member. What do you wear?",
  "choices": [
   {
    "t": "Smart business casual. Chinos, a nice shirt, no tie.",
    "fail": "Fined 1,000 naira and muted for the day",
    "why": "Dressing to the AGM is strictly formal or traditional. Improper dressing costs 1,000 naira and your speaking and voting rights at that meeting."
   },
   {
    "t": "Formal or traditional attire.",
    "ok": true
   },
   {
    "t": "Your JCI Atlantic t-shirt. Show some team spirit.",
    "fail": "Team spirit noted. Fine also noted.",
    "why": "Business meetings call for formal, business casual or traditional attire, and the AGM only accepts formal or traditional."
   }
  ],
  "win": "You look the part. The AGM is strictly formal or traditional.",
  "art": "Article 8-1, Sec. 2"
 },
 {
  "s": 2,
  "title": "Election time",
  "text": "The elections begin. A candidate for President is your friend and you'd love to vote for them. What happens?",
  "choices": [
   {
    "t": "You vote. You're a member now, and every vote counts.",
    "fail": "Your ballot is gently handed back",
    "why": "Newly inducted members can't vote for elected officers at the AGM of the year they were inducted."
   },
   {
    "t": "Give your vote to a senior member as your proxy.",
    "fail": "The General Legal Counsel shakes her head",
    "why": "Proxies aren't recognized, and no one can cast more than one vote."
   },
   {
    "t": "You watch this one. New inductees can't vote for officers at the AGM of their induction year.",
    "ok": true
   }
  ],
  "win": "Next year you'll have the vote. For now, you get a front-row view of how elections run.",
  "art": "Bylaw 6-7"
 },
 {
  "s": 2,
  "title": "Dues season",
  "text": "It's March and money is tight. You can't pay the 30,000 naira dues all at once. What do you do?",
  "choices": [
   {
    "t": "Relax. Dues are due by December.",
    "fail": "April arrives. Your vote doesn't.",
    "why": "Dues are due by 31 March. After that you lose your vote, your speaking rights and financial benefits."
   },
   {
    "t": "Agree a payment plan with the Director of Finance before 31 March, finishing by 31 May.",
    "ok": true
   },
   {
    "t": "Skip this year and pay double next year.",
    "fail": "Two years unpaid, membership withdrawn",
    "why": "Not paying for two consecutive years means automatic withdrawal of membership."
   }
  ],
  "win": "A payment plan agreed before 31 March keeps your rights, as long as it ends by 31 May.",
  "art": "Bylaw 15-4"
 },
 {
  "s": 2,
  "title": "Running late",
  "text": "You know you'll be late to Sunday's General Assembly. What do you do?",
  "choices": [
   {
    "t": "Email the General Secretary at least 12 hours before the meeting.",
    "ok": true
   },
   {
    "t": "Post 'running late' in the WhatsApp group five minutes before start.",
    "fail": "Fined 500 naira for lateness",
    "why": "Apologies go by email to the General Secretary, at least 12 hours before the meeting. Late without notice means a fine."
   },
   {
    "t": "Just slip in quietly. Nobody notices one person.",
    "fail": "The Meeting Manager notices. The Meeting Manager always notices.",
    "why": "The Meeting Manager takes attendance. Arriving less than 5 minutes before start time without notice counts as late."
   }
  ],
  "win": "Written notice by email, 12 hours ahead, keeps you in the clear.",
  "art": "Article 8-1, Sec. 3"
 },
 {
  "s": 3,
  "title": "Joining the Board",
  "text": "You're appointed Director of Communications. The Officers Training School in January clashes with a trip. What do you do?",
  "choices": [
   {
    "t": "Skip it. You'll read the notes later.",
    "fail": "Your seat goes to someone else",
    "why": "The OTS is mandatory for all officers. Missing it is grounds for terminating your position and appointing someone new."
   },
   {
    "t": "Move the trip and attend the OTS.",
    "ok": true
   },
   {
    "t": "Send your assistant to attend on your behalf.",
    "fail": "Your assistant now has your job",
    "why": "Every officer must attend the OTS themselves."
   }
  ],
  "win": "Good call. And as Director of Communications, remember: at least two social media posts every week.",
  "art": "Bylaw 13-5"
 },
 {
  "s": 3,
  "title": "Ambition",
  "text": "You've been a member for 15 months with one Board tenure. You want to run for Vice President this year. Can you?",
  "choices": [
   {
    "t": "Yes. Any member in good standing can run.",
    "fail": "Nomination returned by the committee",
    "why": "VP candidates need at least 23 months of membership and two complete Board tenures, among other requirements."
   },
   {
    "t": "Not yet. You need 23 months as a member and two complete Board tenures.",
    "ok": true
   },
   {
    "t": "Yes, if you pay double the nomination fee.",
    "fail": "The committee is not for sale",
    "why": "The nomination fee doesn't change eligibility."
   }
  ],
  "win": "VP candidates also need to be on the current Board, have attended a JCIN area conference and a national convention, have 70% attendance this year, and have completed two JCI courses.",
  "art": "Article 9-9, Sec. 6"
 },
 {
  "s": 4,
  "title": "The nomination",
  "text": "A year later, you're eligible. How do you get on the ballot for Vice President?",
  "choices": [
   {
    "t": "Stand up at the AGM and announce yourself.",
    "fail": "The President asks if there are written nominations. There are.",
    "why": "Verbal nominations at the AGM happen only if no written nomination has come in for that office."
   },
   {
    "t": "Get a written nomination from two members in good standing to the Nomination Committee at least 30 days before the AGM, then pay 5,000 naira.",
    "ok": true
   },
   {
    "t": "Send your election flier to every platform straight away.",
    "fail": "Flier pulled for review",
    "why": "The Nomination Committee must review and approve fliers before they go out."
   }
  ],
  "win": "You're on the ballot. You win, and you're assigned to Administration.",
  "art": "Bylaw 9-6.3"
 },
 {
  "s": 4,
  "title": "The unexpected",
  "text": "Midway through your term as VP Administration, the President relocates abroad and can't continue. What happens?",
  "choices": [
   {
    "t": "The VP Project automatically becomes President.",
    "fail": "The General Legal Counsel reads the bylaw aloud",
    "why": "The VP Administration has the first right of refusal. The VP Project steps in only if they decline."
   },
   {
    "t": "You have the first right of refusal. If you accept, it's subject to approval at the next General Membership Meeting.",
    "ok": true
   },
   {
    "t": "The Board calls a snap election that weekend.",
    "fail": "Nice try. No snap elections.",
    "why": "A presidential vacancy goes to the VP Administration first, then the VP Project."
   }
  ],
  "win": "You step up to finish the term. Now for the real test: running for a full term of your own.",
  "art": "Bylaw 9-10, Sec. 3"
 },
 {
  "s": 4,
  "title": "Running for President",
  "text": "You want to run for a full term as President. Which checklist do you need to meet?",
  "choices": [
   {
    "t": "Be financial, 3 complete Board tenures, on the current Board, VP experience, 35 months of membership, a JCIN area conference and national convention, 70% attendance this year, and 3 JCI courses.",
    "ok": true
   },
   {
    "t": "Be financial and have 18 months of membership. Experience comes on the job.",
    "fail": "Nomination returned. Again.",
    "why": "Presidential candidates need 35 months of membership, three complete Board tenures and VP experience, among other requirements."
   },
   {
    "t": "Anything goes. You've already been acting President.",
    "fail": "Acting is not the same as eligible",
    "why": "Every presidential candidate must meet the full list of qualifications, without exception."
   }
  ],
  "win": "You meet every requirement. On AGM day, the votes are counted.",
  "art": "Article 9-9, Sec. 5"
 }
];

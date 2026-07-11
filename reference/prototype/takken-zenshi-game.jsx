import { useMemo, useState } from "react";

/* ============================================================
   一肢入魂 — 宅建・権利関係 全肢判定ゲーム(プロトタイプ)
   遊び方: 各肢を ○× 判定 → ×なら「どこが誤りか」をタップ →
   「なぜ誤りか」を選択。判定1点 + 箇所1点 + 理由1点。
   ============================================================ */

const INK = "#26333B";
const PAPER = "#ECEEE9";
const CARD = "#FBFAF7";
const AI_BLUE = "#33557E";
const SHU = "#BF3B33";
const GREEN = "#3D7A55";
const MUTED = "#7C857F";
const LINE = "#D8DAD2";

const SERIF = "'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif";
const SANS = "'Hiragino Kaku Gothic ProN','Yu Gothic','Noto Sans JP',sans-serif";

/* ---------- 用語辞書(点線の語をタップで表示) ---------- */
const TERMS = {
  "クーリングオフ":
    "不意打ち的な場所で契約してしまった買主が、一定期間内なら無条件で申込みの撤回・契約の解除をできる制度。",
  "誇大広告":
    "実際よりも著しく優良・有利であると誤認させる広告。宅建業法32条で禁止され、誰も騙されていなくても(実害がなくても)違反になる。",
  "表示規約":
    "不動産業界が定める広告表示の自主ルール(公正競争規約)。「徒歩1分=80m」などの基準はここで決まっている。",
  "課税事業者":
    "消費税を納める義務のある事業者。受け取る報酬に消費税を上乗せして請求できる。",
  "速算式":
    "報酬の上限を一発で出すための簡便な式。価格400万円超の物件は「価格×3%+6万円」。",
  "媒介":
    "売主と買主の間に立って、契約成立に向けてあっせんすること。代理と違い、自分は契約の当事者にならない。",
  "専任の宅建士":
    "その事務所・案内所に常勤して専ら業務に従事する宅地建物取引士。設置義務のある場所は「ちゃんとした拠点」扱いになる。",
  "買受けの申込み":
    "「この物件を買います」という買主側の意思表示。契約締結より前の段階を指す。",
  "宅建業者":
    "免許を受けて、宅地・建物の売買や仲介などを業として行う者。",
  "8種制限":
    "宅建業者が「自ら売主」、買主が非業者のときだけ適用される8つの買主保護ルール。クーリングオフはその一つ。",
  "背信的悪意者":
    "単に事情を知っていた(悪意)だけでなく、相手を害する目的など信義に反する事情まである者。ここまでくると、登記を備えても保護されない。",
  "所有権移転登記":
    "土地の持ち主が変わったことを、法務局の帳簿(登記簿)に記録すること。「この土地は私のもの」と世間に示す名札の役割。",
  "善意無過失":
    "その事情を知らず(善意)、知らないことに落ち度(過失)もなかったこと。",
  "無権代理":
    "代理権がないのに、代理人のふりをして契約をすること。",
  "意思表示":
    "「売ります」「買います」のように、契約に向けた意思を相手に表すこと。契約はこれの合致で成立する。",
  "取り消す":
    "一応有効に成立した契約を、あとから、はじめにさかのぼって「なかったこと」にすること。",
  "取消権":
    "契約を取り消せる権利。使うと、契約ははじめにさかのぼってなかったことになる。",
  "取消し":
    "一応有効に成立した契約を、あとから、はじめにさかのぼって「なかったこと」にすること。",
  "信義則":
    "「相手の信頼を裏切るような矛盾した行動をしてはいけない」という、民法全体を貫く大原則。",
  "催告権":
    "「追認するのかしないのか、はっきり返事してほしい」と本人に催促できる権利。悪意の相手方でも使える。",
  "追認":
    "あとから「その契約でOK」と認めること。認めると、宙ぶらりんだった契約が有効に確定する。",
  "善意": "その事情を「知らなかった」こと。法律用語なので、良い人という意味ではない。",
  "悪意": "その事情を「知っていた」こと。悪い人という意味ではない。",
  "対抗":
    "自分の権利を相手に主張して認めさせること。「対抗できない」=主張しても負ける、の意味。",
  "登記":
    "不動産の権利を法務局の帳簿(登記簿)に記録すること。「この土地は私のもの」と世間に示す名札の役割。",
  "強迫":
    "脅して無理やり意思表示をさせること。刑法の「脅迫」とは字が違うので注意。",
  "第三者": "契約の当事者(AとBなど)以外の人のこと。",
  "履行": "契約で約束した内容(引渡しや代金の支払いなど)を、実際に実行すること。",
  "判例":
    "最高裁判所が示した判断。条文に書かれていないルールの多くはここから出題される。",
};
const TERM_PATTERN = Object.keys(TERMS)
  .sort((a, b) => b.length - a.length)
  .join("|");

function TermButton({ word, onTerm }) {
  return (
    <button
      onClick={() => onTerm(word)}
      style={{
        font: "inherit",
        lineHeight: "inherit",
        color: "inherit",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "help",
        borderBottom: `2px dotted ${AI_BLUE}`,
      }}
      aria-label={`用語「${word}」の意味を見る`}
    >
      {word}
    </button>
  );
}

function termify(text, onTerm) {
  if (!onTerm) return text;
  const re = new RegExp(TERM_PATTERN, "g");
  const parts = [];
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ word: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((p, i) =>
    typeof p === "string" ? p : <TermButton key={i} word={p.word} onTerm={onTerm} />
  );
}

const QUESTIONS = [
  {
    id: "q1",
    category: "権利関係(民法)",
    topic: "二重譲渡",
    law: "民法177条",
    scenario:
      "Aは、自己所有の土地をBに売却したが、所有権移転登記をしないうちに、同じ土地をCにも売却した。",
    lesson: [
      "土地が二重に売られたら、勝つのは「先に契約した人」ではなく「先に登記した人」(民法177条)。",
      "先の売買の存在を知っていただけ(単なる悪意)の買主も、登記すれば勝てる。",
      "ただし、高値で売りつける目的など信義に反する「背信的悪意者」は、登記しても勝てない。",
    ],
    diagram: {
      nodes: [
        { id: "A", x: 170, y: 45, label: "A", sub: "売主" },
        { id: "B", x: 70, y: 140, label: "B", sub: "買主①" },
        { id: "C", x: 270, y: 140, label: "C", sub: "買主②" },
      ],
      edges: [
        { from: "A", to: "B", label: "① 売買" },
        { from: "A", to: "C", label: "② 売買" },
      ],
    },
    choices: [
      {
        segments: ["Cが先に所有権移転登記を備えた場合、", "Cは、Bに対して土地の所有権を主張することができる。"],
        correct: true,
        reasons: [
          { text: "二重譲渡の優劣は、契約の先後ではなく、先に登記を備えたかどうかで決まるから", correct: true },
          { text: "後から契約した買主のほうが常に優先されるから", correct: false },
          { text: "Cが先に代金を支払ったと考えられるから", correct: false },
        ],
        explanation:
          "その通り。二重譲渡の勝敗は「登記の早い者勝ち」。先に登記を備えたCが所有権を主張できます(民法177条)。",
      },
      {
        segments: [
          "Bは、Cより先にAと売買契約を締結しているので、",
          "登記がなくても、",
          "Cに対して土地の所有権を主張することができる。",
        ],
        correct: false,
        wrongIndex: 1,
        reasons: [
          { text: "不動産の対抗関係は、契約の先後ではなく登記の先後で決まるから", correct: true },
          { text: "Bは背信的悪意者にあたり、保護されないから", correct: false },
          { text: "売買契約は、登記をしなければ契約自体が無効だから", correct: false },
        ],
        explanation:
          "所有権を第三者に主張(対抗)するには登記が必要です(民法177条)。契約の先後は関係なく、BとCの勝負は登記の先後で決まります。なお、契約自体は登記がなくても有効です。",
      },
      {
        segments: [
          "Cが、AB間の売買の事実を知ったうえで購入した場合、",
          "Cは、登記を備えても、",
          "Bに対して土地の所有権を主張することができない。",
        ],
        correct: false,
        wrongIndex: 2,
        reasons: [
          {
            text: "単なる悪意者は保護され、登記を備えれば対抗できるから(負けるのは背信的悪意者だけ)",
            correct: true,
          },
          { text: "悪意であっても、過失がなければ保護されるから", correct: false },
          { text: "登記には公信力が認められているから", correct: false },
        ],
        explanation:
          "先の売買を「知っていただけ」の単なる悪意者は保護され、登記を備えればBに対抗できます。登記しても負けるのは、Bを害する目的があるような「背信的悪意者」だけです。",
      },
      {
        segments: [
          "Cが、Bに高値で売りつけて利益を得る目的で購入した、いわゆる背信的悪意者である場合、",
          "Cは、登記を備えても、Bに対して土地の所有権を主張することができない。",
        ],
        correct: true,
        reasons: [
          { text: "信義に反する背信的悪意者は、登記がないことを主張できる「第三者」にあたらないから", correct: true },
          { text: "悪意の買主は、登記の先後にかかわらず、常に保護されないから", correct: false },
          { text: "背信的悪意者との売買契約は、契約自体が無効だから", correct: false },
        ],
        explanation:
          "その通り。信義に反する「背信的悪意者」は、登記を備えても保護されません(判例)。肢3との違い(単なる悪意との区別)が最大のひっかけポイントです。なお、背信的悪意者でも売買契約自体は有効です。",
      },
    ],
  },
  {
    id: "q2",
    category: "権利関係(民法)",
    topic: "詐欺・強迫と第三者",
    law: "民法96条",
    scenario:
      "Aは、Bにだまされて、A所有の土地をBに売却した。その後、Bはこの土地をCに転売した。",
    lesson: [
      "だまされて(詐欺)した契約も、脅されて(強迫)した契約も、取り消せる。",
      "ただし詐欺の場合、取消し前に現れた「善意無過失の第三者」には取消しを主張できない(96条3項)。",
      "強迫には第三者保護の規定がない。脅された被害者はより厚く守られ、善意無過失の第三者にも勝てる。",
    ],
    diagram: {
      nodes: [
        { id: "A", x: 60, y: 95, label: "A", sub: "被害者" },
        { id: "B", x: 170, y: 95, label: "B", sub: "だました人" },
        { id: "C", x: 280, y: 95, label: "C", sub: "転得者" },
      ],
      edges: [
        { from: "A", to: "B", label: "① 売買(詐欺)" },
        { from: "B", to: "C", label: "② 転売" },
      ],
    },
    choices: [
      {
        segments: ["Aは、Bの詐欺を理由として、", "AB間の売買契約を取り消すことができる。"],
        correct: true,
        reasons: [
          { text: "だまされてした意思表示は、だまされた本人を守るため、取り消せると定められているから", correct: true },
          { text: "詐欺による契約は、取り消すまでもなく当然に無効だから", correct: false },
          { text: "詐欺があった場合、契約はそもそも成立していないと扱われるから", correct: false },
        ],
        explanation:
          "その通り。詐欺による意思表示は取り消すことができます(民法96条1項)。ポイントは「無効」ではなく「取消し」であること。取り消すまでは一応有効です。",
      },
      {
        segments: [
          "Cが、Bの詐欺の事実を知らず、かつ知らないことに過失がなかった場合、",
          "Aは、取消しをCに対抗することができない。",
        ],
        correct: true,
        reasons: [
          { text: "取引の安全を守るため、事情を知らずに買った善意無過失の第三者を保護する規定があるから", correct: true },
          { text: "Cのほうが先に登記を備えているはずだから", correct: false },
          { text: "詐欺の取消しは、当事者であるAB間でしか効力を生じないから", correct: false },
        ],
        explanation:
          "その通り。詐欺による取消しは、取消し前に現れた善意無過失の第三者には対抗できません(民法96条3項)。だまされたAにも落ち度の余地がある分、事情を知らずに買ったCを保護します。登記の有無は関係ありません。",
      },
      {
        segments: [
          "AがBに強迫されて売却した場合であっても、",
          "Cが善意無過失であれば、",
          "Aは、取消しをCに対抗することができない。",
        ],
        correct: false,
        wrongIndex: 2,
        reasons: [
          {
            text: "強迫による取消しには第三者保護の規定がなく、善意無過失の第三者にも対抗できるから",
            correct: true,
          },
          { text: "強迫による契約は、取消しではなく当然に無効だから", correct: false },
          { text: "Cがまだ登記を備えていないから", correct: false },
        ],
        explanation:
          "第三者保護(96条3項)があるのは詐欺だけ。強迫の被害者には落ち度がないため、より厚く保護され、善意無過失の第三者にも取消しを対抗できます。「詐欺=負ける/強迫=勝てる」は超頻出の対比です。",
      },
      {
        segments: [
          "Cが、Bの詐欺の事実を知っていた場合であっても、",
          "Cが先に登記を備えていれば、",
          "Aは、取消しをCに対抗することができない。",
        ],
        correct: false,
        wrongIndex: 2,
        reasons: [
          {
            text: "取消し前の第三者が保護されるのは善意無過失の場合に限られ、悪意のCは登記があっても保護されないから",
            correct: true,
          },
          { text: "取消しの前後を問わず、第三者との関係はすべて登記の先後で決まるから", correct: false },
          { text: "悪意の第三者は、登記を申請することができないから", correct: false },
        ],
        explanation:
          "取消し「前」の第三者との関係は登記ではなく善意無過失かどうかで決まります。詐欺を知っていた悪意のCは、登記があっても保護されません。(なお取消し「後」に現れた第三者との関係は登記で決まる、という別ルールがあり、これが誤答選択肢の元ネタです)",
      },
    ],
  },
  {
    id: "q3",
    category: "権利関係(民法)",
    topic: "無権代理",
    law: "民法113〜117条・判例",
    scenario:
      "Bは、代理権がないにもかかわらず、Aの代理人と称して、A所有の土地をCに売却する契約を締結した。",
    lesson: [
      "代理権のない人が勝手にした契約(無権代理)は、本人Aが追認しない限りAに効力が及ばない。",
      "相手方Cの武器は3つ: 催告権(悪意でもOK)/取消権(善意なら)/無権代理人Bへの責任追及(原則、善意無過失なら)。",
      "無権代理人Bが本人Aを単独相続したら、追認拒絶はできない。自分で売っておいて拒むのは信義則違反。",
    ],
    diagram: {
      nodes: [
        { id: "B", x: 170, y: 45, label: "B", sub: "無権代理人" },
        { id: "A", x: 70, y: 140, label: "A", sub: "本人" },
        { id: "C", x: 270, y: 140, label: "C", sub: "相手方" },
      ],
      edges: [
        { from: "A", to: "B", label: "代理権なし", dashed: true },
        { from: "B", to: "C", label: "売買(Aの代理と称して)" },
      ],
    },
    choices: [
      {
        segments: [
          "Aが追認した場合、",
          "AC間の売買契約は、原則として契約の時にさかのぼって効力を生ずる。",
        ],
        correct: true,
        reasons: [
          { text: "民法が、追認には契約の時にさかのぼる効力(遡及効)があると定めているから", correct: true },
          { text: "無権代理の契約はもともと有効で、追認はそれを確認するだけだから", correct: false },
          { text: "Cが善意であれば、契約時から有効になると定められているから", correct: false },
        ],
        explanation:
          "その通り。追認すると、契約の時にさかのぼって有効になります(民法116条)。「追認した時から」ではない点がひっかけで出ます。なお、無権代理の契約は追認までは本人に効力が及ばない宙ぶらりんの状態で、「もともと有効」ではありません。",
      },
      {
        segments: [
          "Cは、Bに代理権がないことを知らなかった場合、",
          "Aが追認しない間は、契約を取り消すことができる。",
        ],
        correct: true,
        reasons: [
          { text: "善意の相手方には、追認されるかどうか分からない不安定な状態から離脱できる取消権が認められているから", correct: true },
          { text: "相手方は、善意か悪意かを問わず、いつでも契約を取り消せるから", correct: false },
          { text: "無権代理の契約は、取り消すまでもなく無効だから", correct: false },
        ],
        explanation:
          "その通り。善意の相手方には取消権があります(民法115条)。本人が追認する前であれば、契約から離脱できます。ちなみに「善意悪意を問わず使える」のは催告権のほう。取消権は善意限定、という対比で覚えましょう。",
      },
      {
        segments: [
          "Cは、Bに代理権がないことを知っていた場合であっても、",
          "Bに対して、",
          "契約の履行または損害賠償を請求することができる。",
        ],
        correct: false,
        wrongIndex: 2,
        reasons: [
          {
            text: "無権代理人への責任追及(履行・損害賠償)は、原則として善意無過失の相手方に限られるから",
            correct: true,
          },
          { text: "悪意の相手方でも、損害賠償だけは請求できるから", correct: false },
          { text: "Bへの責任追及には、本人Aの同意が必要だから", correct: false },
        ],
        explanation:
          "無権代理人の責任(民法117条)を追及できるのは、原則として善意無過失の相手方だけです。代理権がないと知っていた悪意のCは、履行も損害賠償も請求できません。",
      },
      {
        segments: [
          "Aが死亡し、BがAを単独で相続した場合、",
          "Bは、Aの資格で",
          "追認を拒絶することができる。",
        ],
        correct: false,
        wrongIndex: 2,
        reasons: [
          {
            text: "自ら無権代理行為をした者が本人の資格で追認を拒絶するのは、信義則に反し許されないから",
            correct: true,
          },
          { text: "相続によって、売買契約は当然に無効となるから", correct: false },
          { text: "追認の拒絶には、相手方Cの同意が必要だから", correct: false },
        ],
        explanation:
          "無権代理人が本人を単独相続した場合、追認拒絶は信義則上許されず、契約は当然に有効になります(判例)。「自分で勝手に売っておいて、相続したら『売らない』はずるい」という感覚のままでOK。逆パターン(本人が無権代理人を相続)は拒絶できる点もセットで頻出です。",
      },
    ],
  },
  {
    id: "q4",
    category: "宅建業法",
    topic: "クーリングオフ",
    law: "宅建業法37条の2",
    scenario:
      "宅建業者Aは、自ら売主として、宅建業者ではない買主Bとの間で宅地の売買契約を締結しようとしている。",
    lesson: [
      "クーリングオフは「宅建業者が自ら売主、買主が非業者」の契約だけで使える制度(8種制限の一つ)。",
      "「事務所等」(事務所、専任の宅建士を置く土地に定着した案内所、買主が自ら指定した自宅・勤務先など)で申込みをした場合は使えない。冷静に判断できる場所だから。",
      "使えなくなるのは、①書面で告げられた日から起算して8日を経過したとき、②引渡しを受け「かつ」代金全部を支払ったとき。解除の通知は書面で行い、発信した時に効力が生じる。",
    ],
    diagram: {
      nodes: [
        { id: "A", x: 90, y: 90, label: "A", sub: "売主(宅建業者)" },
        { id: "B", x: 250, y: 90, label: "B", sub: "買主(非業者)" },
      ],
      edges: [{ from: "A", to: "B", label: "宅地の売買" }],
    },
    choices: [
      {
        segments: [
          "Bが、Aの事務所で買受けの申込みをした場合、",
          "Bは、クーリングオフによる解除をすることができない。",
        ],
        correct: true,
        reasons: [
          {
            text: "事務所は落ち着いて判断できる場所であり、そこで申込みをした買主を保護する必要がないから",
            correct: true,
          },
          { text: "事務所では、申込みと同時に契約が成立するから", correct: false },
          { text: "買主が事務所に出向いた時点で、契約を承諾したものとみなされるから", correct: false },
        ],
        explanation:
          "その通り。クーリングオフは「不意打ち的な場所で契約させられた買主」を守る制度なので、冷静に判断できる事務所等で申込みをした場合は適用されません。",
      },
      {
        segments: [
          "クーリングオフができる旨を口頭で告げられた日から起算して",
          "8日を経過したときは、",
          "Bは、クーリングオフによる解除をすることができない。",
        ],
        correct: false,
        wrongIndex: 0,
        reasons: [
          { text: "8日間のカウントが始まるのは、書面で告げられた日からだから", correct: true },
          { text: "口頭で告げられた場合は、6日を経過すると解除できなくなるから", correct: false },
          { text: "クーリングオフの告知は、そもそも不要だから", correct: false },
        ],
        explanation:
          "8日間のカウントが始まるのは「書面で」告げられた日から。口頭の告知では期間は進行しないので、いつまでもクーリングオフできる状態が続きます。「口頭で告げられた日から」とすり替えるのが定番のひっかけです。",
      },
      {
        segments: [
          "Bが宅地の引渡しを受けた場合、",
          "代金の全部を支払っていなくても、",
          "Bは、クーリングオフによる解除をすることができない。",
        ],
        correct: false,
        wrongIndex: 1,
        reasons: [
          {
            text: "解除できなくなるのは「引渡しを受け、かつ、代金全部を支払った」両方を満たしたときだけだから",
            correct: true,
          },
          { text: "代金の一部でも支払うと、解除できなくなるから", correct: false },
          { text: "引渡しを受けると所有権が移転し、契約が確定するから", correct: false },
        ],
        explanation:
          "クーリングオフができなくなるのは、引渡し「かつ」代金全額支払いの両方が揃ったときだけ。片方だけなら、まだ解除できます。「かつ」を「または」にすり替えるのも頻出パターンです。",
      },
      {
        segments: [
          "Bが、テント張りの案内所で買受けの申込みをした場合、",
          "他の要件を満たせば、Bは、クーリングオフによる解除をすることができる。",
        ],
        correct: true,
        reasons: [
          {
            text: "土地に定着しないテント張りの案内所は、冷静に判断できる「事務所等」にあたらないから",
            correct: true,
          },
          { text: "案内所は、種類を問わずすべて「事務所等」にあたらないから", correct: false },
          { text: "テント張りの案内所での申込みは、申込み自体が無効だから", correct: false },
        ],
        explanation:
          "その通り。テント張りのような土地に定着しない案内所は「事務所等」にあたらず、クーリングオフ可能です。ただし、専任の宅建士を置くべき土地に定着した案内所は「事務所等」扱いで不可。「案内所ならすべてOK」ではない点に注意。",
      },
    ],
  },
  {
    id: "q5",
    category: "宅建業法",
    topic: "報酬額の制限",
    law: "宅建業法46条",
    type: "calc",
    scenario:
      "宅建業者A(課税事業者)は、B所有の宅地の売買の媒介を依頼され、売買契約を成立させた。",
    lesson: [
      "売買の媒介報酬の上限(価格400万円超)は、速算式「価格 × 3% + 6万円」で出す。",
      "課税事業者は、計算した報酬の全体に消費税10%を上乗せできる(6万円の部分も課税対象)。",
      "媒介で受け取れるのは、依頼者の一方からこの上限まで。双方から依頼されていれば、それぞれから上限まで受け取れる。",
    ],
    diagram: {
      nodes: [
        { id: "A", x: 90, y: 90, label: "A", sub: "宅建業者(課税)" },
        { id: "B", x: 250, y: 90, label: "B", sub: "依頼者(売主)" },
      ],
      edges: [{ from: "B", to: "A", label: "売買の媒介を依頼" }],
    },
    calc: {
      prompt: "AがBから受領できる報酬の上限額はいくらか。",
      given: [
        { label: "売買価格", value: "3,000万円(税抜)" },
        { label: "取引態様", value: "媒介(依頼者の一方から)" },
        { label: "消費税", value: "Aは課税事業者(10%)" },
      ],
      build: [
        {
          label: "第一式 — 速算式を選ぶ",
          options: [
            { formula: "3,000万円 × 3% + 6万円", value: 96, correct: true, trap: "" },
            { formula: "3,000万円 × 5%", value: 150, correct: false, trap: "低価格帯(200万円以下)の率を全体に適用する誤り" },
            { formula: "(3,000万円 − 400万円) × 4%", value: 104, correct: false, trap: "区分計算と速算式の混同" },
          ],
        },
        {
          label: "第二式 — 消費税の扱いを選ぶ",
          options: [
            { formula: "全体に × 1.10(消費税10%)", kind: "taxAll", correct: true, trap: "" },
            { formula: "消費税は上乗せしない", kind: "taxNone", correct: false, trap: "課税事業者の上乗せ忘れ — 定番の失点" },
            { formula: "6万円を除いた部分だけ × 1.10", kind: "taxPartial6", correct: false, trap: "6万円の部分にも消費税はかかる" },
          ],
        },
      ],
      canonical: [
        { label: "① 速算式(売買価格400万円超)", formula: "3,000万円 × 3% + 6万円 = 96万円" },
        { label: "② 課税事業者は消費税10%を上乗せ", formula: "96万円 × 1.10 = 105.6万円" },
        { label: "③ 媒介 — 依頼者の一方から受領できる上限", formula: "105.6万円" },
      ],
      answer: 105.6,
      unit: "万円",
    },
  },
  {
    id: "q6",
    category: "宅建業法",
    topic: "広告規制",
    law: "宅建業法32条・表示規約",
    type: "spot",
    scenario:
      "宅建業者「みどり台不動産販売」が出した戸建売買の広告を押収した。この広告には違反が4箇所ある。疑わしい記載をタップし、根拠を持って申し立てよ。誤った申立ては減点。",
    lesson: [
      "誇大広告の禁止(32条): 実際より著しく優良・有利と誤認させる表示は、実害がなくても違反。",
      "表示規約の定番ルール: 「新築」は建築後1年未満かつ未入居だけ / 徒歩は道路距離80m=1分・端数切上げ / 根拠のない最上級表現(日本一・完璧など)は禁止。",
      "得点は「4 − 誤指摘数」。適法な記載を疑って申し立てると減点される。疑わしきは根拠とセットで。",
    ],
    spot: {
      errorCount: 4,
      zones: [
        { id: "A", violation: true, name: "「新築」の表示", reason: "「新築」と表示できるのは建築後1年未満かつ未入居の物件だけ。この物件は築3年。" },
        { id: "B", violation: true, name: "「日本一の眺望」", reason: "根拠のない最上級表現(日本一・完璧・抜群 等)は使用禁止。" },
        { id: "C", violation: true, name: "徒歩3分(約650m)", reason: "徒歩分数は道路距離80m=1分・端数切上げ。650mなら9分と表示すべき。" },
        { id: "D", violation: true, name: "イメージ写真のみの掲載", reason: "他物件・施工例の写真を、あたかも当該物件の写真のように用いるのは不当表示。" },
        { id: "safePrice", violation: false, name: "価格の表示", note: "税込の総額表示 — 適法です。" },
        { id: "safeMadori", violation: false, name: "間取り・面積の表示", note: "㎡での表記 — 適法です。" },
        { id: "safeChiku", violation: false, name: "築年月の表示", note: "事実の記載 — 適法です。ただし、上の「新築」表記と矛盾していないか?" },
      ],
    },
  },
];

/* ---------- 関係図 ---------- */
function Diagram({ data }) {
  const R = 22;
  const nodeById = Object.fromEntries(data.nodes.map((n) => [n.id, n]));
  return (
    <svg viewBox="0 0 340 185" style={{ width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }} role="img" aria-label="登場人物の関係図">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={AI_BLUE} />
        </marker>
      </defs>
      {data.edges.map((e, i) => {
        const a = nodeById[e.from];
        const b = nodeById[e.to];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / len, uy = dy / len;
        const x1 = a.x + ux * (R + 4), y1 = a.y + uy * (R + 4);
        const x2 = b.x - ux * (R + 8), y2 = b.y - uy * (R + 8);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={AI_BLUE} strokeWidth="1.8" markerEnd="url(#arrow)" strokeDasharray={e.dashed ? "5 4" : "none"} />
            <text x={mx} y={my - 7} textAnchor="middle" fontSize="11" fill={AI_BLUE} style={{ fontFamily: SANS, paintOrder: "stroke", stroke: CARD, strokeWidth: 4, strokeLinejoin: "round" }}>
              {e.label}
            </text>
          </g>
        );
      })}
      {data.nodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={R} fill={CARD} stroke={INK} strokeWidth="1.6" />
          <text x={n.x} y={n.y + 6} textAnchor="middle" fontSize="17" fontWeight="700" fill={INK} style={{ fontFamily: SERIF }}>
            {n.label}
          </text>
          <text x={n.x} y={n.y + R + 15} textAnchor="middle" fontSize="10.5" fill={MUTED} style={{ fontFamily: SANS }}>
            {n.sub}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ---------- 朱印スタンプ ---------- */
function Stamp({ text, color, small }) {
  const size = small ? 52 : 92;
  return (
    <div
      className="stamp-in"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${small ? 2.5 : 4}px solid ${color}`,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: SERIF,
        fontWeight: 800,
        fontSize: small ? 20 : 34,
        transform: "rotate(-12deg)",
        letterSpacing: text.length > 1 ? 1 : 0,
        background: "rgba(251,250,247,0.85)",
        boxShadow: `0 0 0 1px rgba(191,59,51,0.06)`,
      }}
    >
      {text}
    </div>
  );
}

/* ---------- 小さな部品 ---------- */
function Eyebrow({ children }) {
  return (
    <div style={{ fontFamily: SANS, fontSize: 11, letterSpacing: 2.5, color: MUTED, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- マイソク広告(spot用) ---------- */
function SpotAd({ found, pending, done, onTap }) {
  const zb = (id) => `2px solid ${pending === id ? AI_BLUE : "transparent"}`;
  const Mark = ({ id, inset, rot, badge }) =>
    found.includes(id) ? (
      <>
        <span className="fade-up" style={{ position: "absolute", inset, border: "2.5px solid rgba(191,59,51,0.85)", borderRadius: "50%", transform: `rotate(${rot}deg)`, pointerEvents: "none" }} />
        <span style={{ position: "absolute", ...badge, width: 20, height: 20, borderRadius: "50%", background: SHU, color: CARD, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF }}>
          {found.indexOf(id) + 1}
        </span>
      </>
    ) : null;

  return (
    <div style={{ position: "relative", padding: "14px 10px 10px" }}>
      {/* 台紙のテープ */}
      <div style={{ position: "absolute", top: 2, left: 38, width: 64, height: 18, background: "rgba(203,192,158,0.55)", transform: "rotate(-4deg)", boxShadow: "0 1px 2px rgba(0,0,0,0.12)", zIndex: 2 }} />
      <div style={{ position: "absolute", top: 2, right: 38, width: 64, height: 18, background: "rgba(203,192,158,0.55)", transform: "rotate(3deg)", boxShadow: "0 1px 2px rgba(0,0,0,0.12)", zIndex: 2 }} />

      <div style={{ position: "relative", background: "#FFFFFF", border: "1px solid #C9C7BE", boxShadow: "0 2px 8px rgba(38,51,59,0.12)", transform: "rotate(-0.6deg)", padding: "12px 12px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #C7000B", paddingBottom: 6 }}>
          <b style={{ fontSize: 13, letterSpacing: 1 }}>みどり台不動産販売</b>
          <span style={{ background: "#C7000B", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px" }}>売買・戸建</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <button onClick={() => onTap("A")} style={{ position: "relative", cursor: "pointer", padding: "4px 8px", minHeight: 32, background: "#C7000B", color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: 1, border: zb("A") }}>
            新築
            <Mark id="A" inset="-5px -7px" rot={-3} badge={{ top: -13, left: -13 }} />
          </button>
          <button onClick={() => onTap("B")} style={{ position: "relative", cursor: "pointer", background: "none", padding: "4px 2px", minHeight: 32, textAlign: "left", fontFamily: "inherit", border: zb("B") }}>
            <span style={{ color: "#C7000B", fontSize: 14.5, fontWeight: 800 }}>日本一の眺望!陽当り良好</span>
            <Mark id="B" inset="-4px -6px" rot={-2} badge={{ top: -13, right: -10 }} />
          </button>
        </div>

        <button onClick={() => onTap("D")} style={{ position: "relative", cursor: "pointer", padding: 0, width: "100%", marginTop: 10, display: "block", background: "none", fontFamily: "inherit", border: zb("D") }}>
          <div style={{ height: 110, background: "repeating-linear-gradient(45deg,#E8E6E0 0 12px,#DEDCD4 12px 24px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#9AA09A", fontSize: 12, letterSpacing: 2 }}>外観写真</div>
          <div style={{ position: "absolute", bottom: 4, right: 6, fontSize: 9, color: "#666", background: "rgba(255,255,255,0.85)", padding: "1px 4px" }}>※写真はイメージです(当社施工例)</div>
          <Mark id="D" inset="6px 20px" rot={-2} badge={{ top: -8, right: 8 }} />
        </button>

        <button onClick={() => onTap("safePrice")} style={{ cursor: "pointer", background: "none", width: "100%", display: "flex", alignItems: "baseline", gap: 6, marginTop: 10, border: zb("safePrice"), borderBottom: "1px solid #DDD", padding: "2px 2px 6px", fontFamily: "inherit", textAlign: "left" }}>
          <span style={{ fontSize: 11, color: "#555" }}>販売価格</span>
          <span style={{ color: "#C7000B", fontSize: 24, fontWeight: 800, letterSpacing: 0.5 }}>3,480<span style={{ fontSize: 13 }}>万円</span></span>
          <span style={{ fontSize: 10, color: "#777" }}>(税込)</span>
        </button>

        <div style={{ fontSize: 11.5, color: "#333" }}>
          <button onClick={() => onTap("C")} style={{ position: "relative", cursor: "pointer", background: "none", width: "100%", minHeight: 40, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 2px", border: zb("C"), borderBottom: "1px dotted #DDD", fontFamily: "inherit", fontSize: 11.5, color: "#333", textAlign: "left" }}>
            <span style={{ color: "#888" }}>交通</span><b>みどり線「みどり台」駅 徒歩3分(約650m)</b>
            <Mark id="C" inset="0 90px 0 46px" rot={-1} badge={{ top: -9, right: 84 }} />
          </button>
          <button onClick={() => onTap("safeMadori")} style={{ cursor: "pointer", background: "none", width: "100%", minHeight: 34, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 2px", border: zb("safeMadori"), borderBottom: "1px dotted #DDD", fontFamily: "inherit", fontSize: 11.5, color: "#333", textAlign: "left" }}>
            <span style={{ color: "#888" }}>間取り</span><b>3LDK(土地120.5㎡ / 建物98.2㎡)</b>
          </button>
          <button onClick={() => onTap("safeChiku")} style={{ cursor: "pointer", background: "none", width: "100%", minHeight: 34, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 2px", border: zb("safeChiku"), fontFamily: "inherit", fontSize: 11.5, color: "#333", textAlign: "left" }}>
            <span style={{ color: "#888" }}>築年月</span><b>2023年4月(築3年)</b>
          </button>
        </div>
        <div style={{ fontSize: 9, color: "#999", marginTop: 6, borderTop: "1px solid #EEE", paddingTop: 4 }}>みどり県知事(1)第12345号 / (公社)全国宅地建物取引業保証協会加入</div>

        {done && (
          <div className="stamp-in" style={{ position: "absolute", top: "34%", left: "50%", marginLeft: -44, width: 88, height: 88, borderRadius: "50%", border: `3px solid ${SHU}`, color: SHU, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontWeight: 800, fontSize: 30, letterSpacing: 4, transform: "rotate(-12deg)", background: "rgba(255,255,255,0.82)", zIndex: 3 }}>
            摘発
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================ */
export default function App() {
  const [screen, setScreen] = useState("start"); // start | play | result
  const [selected, setSelected] = useState(() => new Set(QUESTIONS.map((_, i) => i)));
  const [sessionItems, setSessionItems] = useState([]); // [{qi, ci}]
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("judge"); // judge | locate | reason | explain
  const [judgePick, setJudgePick] = useState(null); // true=○ false=×
  const [locatePick, setLocatePick] = useState(null);
  const [reasonPick, setReasonPick] = useState(null);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [activeTerm, setActiveTerm] = useState(null);
  const [calcF, setCalcF] = useState(null); // calc: 第一式の選択
  const [calcT, setCalcT] = useState(null); // calc: 第二式の選択
  const [spotFound, setSpotFound] = useState([]); // spot: 認容された違反id(発見順)
  const [spotWrong, setSpotWrong] = useState(0); // spot: 誤指摘数
  const [spotPending, setSpotPending] = useState(null); // spot: 申立て確認中のid
  const [spotMsg, setSpotMsg] = useState(null); // spot: {accent, title, body}
  const [records, setRecords] = useState([]); // 今回セッション {qi, ci, pts, max}
  const [history, setHistory] = useState({}); // 通算・最新結果 "qi-ci" -> {pts, max}
  const openTerm = (w) => setActiveTerm((cur) => (cur === w ? null : w));

  const item = sessionItems[idx];
  const qi = item?.qi ?? 0;
  const ci = item?.ci ?? 0;
  const q = QUESTIONS[qi];
  const isCalc = q?.type === "calc";
  const isSpot = q?.type === "spot";
  const isZenshi = !isCalc && !isSpot;
  const choice = q && isZenshi ? q.choices[ci] : null;
  const shuffledReasons = useMemo(
    () => (choice ? shuffle(choice.reasons) : []),
    [idx, sessionItems] // eslint-disable-line
  );

  const score = records.reduce((s, r) => s + r.pts, 0);

  /* --- 肢ごとの習熟(最新結果ベース) --- */
  const maxOf = (it) => {
    const qq = QUESTIONS[it.qi];
    if (qq.type === "calc") return 2;
    if (qq.type === "spot") return qq.spot.errorCount;
    return qq.choices[it.ci].correct ? 2 : 3;
  };
  const itemCountOf = (qq) => (qq.type === "calc" || qq.type === "spot" ? 1 : qq.choices.length);
  const allItems = QUESTIONS.flatMap((qq, i) =>
    Array.from({ length: itemCountOf(qq) }, (_, j) => ({ qi: i, ci: j }))
  );
  const sessionMax = sessionItems.reduce((s, it) => s + maxOf(it), 0);
  const weakItems = allItems.filter((it) => {
    const h = history[`${it.qi}-${it.ci}`];
    return h && h.pts < h.max;
  });
  const topicStats = (i) => {
    const qq = QUESTIONS[i];
    const n = itemCountOf(qq);
    const items = Array.from({ length: n }, (_, j) => history[`${i}-${j}`]);
    const tried = items.filter(Boolean);
    if (tried.length === 0) return null;
    return {
      pts: tried.reduce((s, h) => s + h.pts, 0),
      max: Array.from({ length: n }, (_, j) => maxOf({ qi: i, ci: j })).reduce((s, m) => s + m, 0),
      perfect: items.filter((h) => h && h.pts === h.max).length,
      total: n,
    };
  };

  const currentPts = () => {
    let pts = 0;
    if (judgePick === choice.correct) pts += 1;
    if (judgePick === choice.correct && reasonPick !== null && shuffledReasons[reasonPick]?.correct) pts += 1;
    if (!choice.correct && judgePick === false && locatePick === choice.wrongIndex) pts += 1;
    return pts;
  };

  const finishChoice = (pts) => {
    const max = choice.correct ? 2 : 3;
    setRecords((r) => [...r, { qi, ci, pts, max }]);
    setHistory((h) => ({ ...h, [`${qi}-${ci}`]: { pts, max } }));
  };

  const handleJudge = (pick) => {
    setJudgePick(pick);
    if (pick !== choice.correct) {
      // 判定ミス → 解説へ
      finishChoice(0);
      setPhase("explain");
    } else if (choice.correct) {
      // ○を正しく判定 → 根拠選択へ
      setPhase("reason");
    } else {
      // ×を正しく見抜いた → 箇所探しへ
      setPhase("locate");
    }
  };

  const handleLocate = (i) => {
    setLocatePick(i);
    setPhase("reason");
  };

  const handleReason = (i) => {
    setReasonPick(i);
    let pts = 1; // 判定は正解済み
    if (!choice.correct && locatePick === choice.wrongIndex) pts += 1;
    if (shuffledReasons[i].correct) pts += 1;
    finishChoice(pts);
    setPhase("explain");
  };

  /* --- calc(報酬計算)エンジン --- */
  const calcDone = isCalc && calcT !== null;
  const handleCalcF = (i) => {
    if (calcF !== null) return;
    setCalcF(i);
  };
  const handleCalcT = (i) => {
    if (calcT !== null || calcF === null) return;
    setCalcT(i);
    const fOk = q.calc.build[0].options[calcF].correct;
    const tOk = q.calc.build[1].options[i].correct;
    const pts = (fOk ? 1 : 0) + (tOk ? 1 : 0);
    setRecords((r) => [...r, { qi, ci, pts, max: 2 }]);
    setHistory((h) => ({ ...h, [`${qi}-${ci}`]: { pts, max: 2 } }));
  };
  const calcFmt = (v) => {
    const r = Math.round(v * 100) / 100;
    return r % 1 ? r.toFixed(1) : String(r);
  };
  const calcResult = () => {
    // 選んだ式のまま計算した結果(誤った選択の帰結も見せる)
    const base = q.calc.build[0].options[calcF].value;
    const kind = q.calc.build[1].options[calcT].kind;
    const line1 = `${q.calc.build[0].options[calcF].formula} = ${calcFmt(base)}万円`;
    let val, line2;
    if (kind === "taxAll") { val = base * 1.1; line2 = `${calcFmt(base)}万円 × 1.10 = ${calcFmt(val)}万円`; }
    else if (kind === "taxNone") { val = base; line2 = `消費税なし → ${calcFmt(val)}万円`; }
    else { val = (base - 6) * 1.1 + 6; line2 = `(${calcFmt(base)}万円 − 6万円) × 1.10 + 6万円 = ${calcFmt(val)}万円`; }
    return { line1, line2 };
  };

  /* --- spot(間違い探し)エンジン --- */
  const spotDone = isSpot && spotFound.length === q.spot.errorCount;
  const handleSpotZone = (id) => {
    if (spotDone || spotFound.includes(id) || spotPending === id) return;
    setSpotPending(id);
    setSpotMsg(null);
  };
  const handleSpotAccuse = () => {
    const id = spotPending;
    if (!id) return;
    const z = q.spot.zones.find((zz) => zz.id === id);
    setSpotPending(null);
    if (z.violation) {
      const nf = [...spotFound, id];
      setSpotFound(nf);
      setSpotMsg({ accent: GREEN, title: `申立て認容 — ${z.name}`, body: z.reason });
      if (nf.length === q.spot.errorCount) {
        const pts = Math.max(0, q.spot.errorCount - spotWrong);
        setRecords((r) => [...r, { qi, ci, pts, max: q.spot.errorCount }]);
        setHistory((h) => ({ ...h, [`${qi}-${ci}`]: { pts, max: q.spot.errorCount } }));
      }
    } else {
      setSpotWrong((w) => w + 1);
      setSpotMsg({ accent: SHU, title: `申立て棄却 — ${z.name}`, body: z.note });
    }
  };
  const handleSpotWithdraw = () => setSpotPending(null);

  const startSession = (items) => {
    setSessionItems(items);
    setIdx(0);
    setRecords([]);
    setPhase("judge");
    setJudgePick(null); setLocatePick(null); setReasonPick(null);
    setCalcF(null); setCalcT(null);
    setSpotFound([]); setSpotWrong(0); setSpotPending(null); setSpotMsg(null);
    setLessonOpen(false); setActiveTerm(null);
    setScreen("play");
  };

  const startNormal = () => {
    const items = allItems.filter((it) => selected.has(it.qi));
    if (items.length) startSession(items);
  };

  const startWeak = () => {
    if (weakItems.length) startSession(weakItems);
  };

  const startSessionMisses = () => {
    const misses = records.filter((r) => r.pts < r.max).map((r) => ({ qi: r.qi, ci: r.ci }));
    if (misses.length) startSession(misses);
  };

  const next = () => {
    setJudgePick(null);
    setLocatePick(null);
    setReasonPick(null);
    setCalcF(null);
    setCalcT(null);
    setSpotFound([]); setSpotWrong(0); setSpotPending(null); setSpotMsg(null);
    setActiveTerm(null);
    if (idx + 1 < sessionItems.length) {
      if (sessionItems[idx + 1].qi !== qi) setLessonOpen(false);
      setIdx(idx + 1);
      setPhase("judge");
    } else {
      setScreen("result");
    }
  };

  const toTop = () => {
    setScreen("start");
    setPhase("judge");
    setJudgePick(null); setLocatePick(null); setReasonPick(null);
    setLessonOpen(false); setActiveTerm(null);
  };

  const toggleTopic = (i) => {
    setSelected((s) => {
      const nextSet = new Set(s);
      if (nextSet.has(i)) nextSet.delete(i);
      else nextSet.add(i);
      return nextSet;
    });
  };

  /* ---------- 共通スタイル ---------- */
  const css = `
    @keyframes stampIn {
      0% { opacity: 0; transform: rotate(-12deg) scale(1.9); }
      55% { opacity: 1; transform: rotate(-12deg) scale(0.92); }
      100% { opacity: 1; transform: rotate(-12deg) scale(1); }
    }
    .stamp-in { animation: stampIn .38s cubic-bezier(.2,.9,.3,1.2) both; }
    @keyframes fadeUp { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
    .fade-up { animation: fadeUp .3s ease both; }
    @media (prefers-reduced-motion: reduce) {
      .stamp-in, .fade-up { animation: none; }
    }
    .seg-btn:hover { background: rgba(51,85,126,0.08); }
    .opt-btn:hover { border-color: ${AI_BLUE}; }
    button:focus-visible { outline: 3px solid ${AI_BLUE}; outline-offset: 2px; }
  `;

  const page = {
    minHeight: "100vh",
    background: PAPER,
    color: INK,
    fontFamily: SANS,
    display: "flex",
    justifyContent: "center",
    padding: "24px 16px 64px",
  };
  const col = { width: "100%", maxWidth: 560 };
  const card = {
    background: CARD,
    border: `1px solid ${LINE}`,
    borderRadius: 10,
    padding: "20px",
  };

  /* ================= START ================= */
  if (screen === "start") {
    return (
      <div style={page}>
        <style>{css}</style>
        <div style={col}>
          <div style={{ textAlign: "center", margin: "40px 0 32px" }}>
            <Eyebrow>宅建・権利関係(民法)</Eyebrow>
            <h1 style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 800, margin: "12px 0 8px", letterSpacing: 6 }}>
              一肢入魂
            </h1>
            <p style={{ color: MUTED, fontSize: 13, margin: 0, lineHeight: 2, letterSpacing: 0.3 }}>
              4択を当てるゲームではない。<br />全部の肢に、理由をつけて決着をつけるゲーム。
            </p>
          </div>

          <div style={{ ...card, marginBottom: 16 }}>
            <Eyebrow>遊び方</Eyebrow>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 15, margin: "4px 0 12px" }}>三段で決着をつける</div>
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2, fontSize: 14 }}>
              <li>肢(選択肢の文)を1つずつ読み、<b>正しい / 誤り</b> を判定する <span style={{ color: SHU }}>… 1点</span></li>
              <li>「誤り」なら、文中の<b>誤っている箇所</b>をタップし <span style={{ color: SHU }}>… 1点</span>、<b>なぜ誤りか</b>を選ぶ <span style={{ color: SHU }}>… 1点</span></li>
              <li>「正しい」なら、<b>なぜ正しいと言えるのか根拠</b>を選ぶ <span style={{ color: SHU }}>… 1点</span></li>
            </ol>
            <p style={{ fontSize: 13, color: MUTED, margin: "14px 0 0", paddingTop: 12, borderTop: `1px solid ${LINE}`, lineHeight: 1.9 }}>
              勘で当たっても、根拠と理由が答えられなければ点は伸びません。本試験の「個数問題」対策と同じ頭の使い方です。
            </p>
          </div>

          <div style={{ ...card, marginBottom: 16 }}>
            <Eyebrow>出題範囲</Eyebrow>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 15, margin: "4px 0 4px" }}>審理する論点を選ぶ</div>
            <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 12px", lineHeight: 1.8 }}>
              タップで選択 / 解除。挑戦済みの分野には成績が表示されます。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...new Set(QUESTIONS.map((qq) => qq.category))].map((cat) => (
                <div key={cat} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontFamily: SANS, fontSize: 11, letterSpacing: 2, color: MUTED, marginTop: 6 }}>
                    {cat}
                  </div>
                  {QUESTIONS.map((qq, i) => {
                    if (qq.category !== cat) return null;
                    const on = selected.has(i);
                    const st = topicStats(i);
                    return (
                  <button
                    key={qq.id}
                    onClick={() => toggleTopic(i)}
                    aria-pressed={on}
                    style={{
                      textAlign: "left", padding: 14, borderRadius: 10, cursor: "pointer",
                      background: on ? "rgba(51,85,126,0.07)" : CARD,
                      border: `2px solid ${on ? AI_BLUE : LINE}`,
                      fontFamily: SANS, color: INK,
                      opacity: on ? 1 : 0.75,
                      transition: "border-color .15s, background .15s, opacity .15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* チェックインジケーター(自前描画) */}
                      <span
                        aria-hidden="true"
                        style={{
                          flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
                          border: `2px solid ${on ? AI_BLUE : "#B9BEB6"}`,
                          background: on ? AI_BLUE : "transparent",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          transition: "background .15s, border-color .15s",
                        }}
                      >
                        {on && (
                          <svg viewBox="0 0 12 12" width="12" height="12">
                            <path d="M2 6.5 L5 9.2 L10 2.8" fill="none" stroke={CARD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, display: "block" }}>{qq.topic}</span>
                        <span style={{ color: MUTED, fontWeight: 400, fontSize: 12 }}>{qq.law}</span>
                      </span>
                      {st ? (
                        <span style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 700, color: st.perfect === st.total ? GREEN : st.pts >= st.max * 0.6 ? INK : SHU, whiteSpace: "nowrap" }}>
                          {st.pts}/{st.max}点・完璧 {st.perfect}/{st.total}肢
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: MUTED, whiteSpace: "nowrap" }}>未挑戦</span>
                      )}
                    </div>
                    {st && (
                      <div style={{ height: 4, background: LINE, borderRadius: 2, marginTop: 10 }}>
                        <div style={{ height: 4, width: `${Math.round((st.pts / st.max) * 100)}%`, background: st.perfect === st.total ? GREEN : SHU, borderRadius: 2 }} />
                      </div>
                    )}
                  </button>
                );
              })}
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <span style={{ color: MUTED }}>
                知識ゼロでも大丈夫。<span style={{ borderBottom: `2px dotted ${AI_BLUE}`, color: INK }}>点線のついた法律用語</span>はタップすると意味が表示されます。ルールを先に予習したいときは、各問の「30秒レッスン」をどうぞ。
              </span>
            </div>
          </div>

          <button
            onClick={startNormal}
            disabled={selected.size === 0}
            style={{
              width: "100%", padding: "16px 0", fontSize: 17, fontWeight: 700,
              fontFamily: SERIF, letterSpacing: 5, color: CARD,
              background: selected.size === 0 ? MUTED : INK,
              border: "none", borderRadius: 10,
              cursor: selected.size === 0 ? "not-allowed" : "pointer",
            }}
          >
            開廷する{selected.size > 0 && `(${[...selected].reduce((s, i) => s + QUESTIONS[i].choices.length, 0)}肢)`}
          </button>

          {weakItems.length > 0 && (
            <button
              onClick={startWeak}
              style={{
                width: "100%", padding: "14px 0", fontSize: 15, fontWeight: 700, marginTop: 10,
                fontFamily: SERIF, letterSpacing: 3, color: SHU, background: CARD,
                border: `2px solid ${SHU}`, borderRadius: 10, cursor: "pointer",
              }}
            >
              弱点だけ復習する({weakItems.length}肢)
            </button>
          )}
          <p style={{ fontSize: 11.5, color: MUTED, textAlign: "center", marginTop: 14 }}>
            ※ プロトタイプのため、成績はこのページを開いている間だけ記録されます
          </p>
        </div>
      </div>
    );
  }

  /* ================= RESULT ================= */
  if (screen === "result") {
    const pct = sessionMax > 0 ? Math.round((score / sessionMax) * 100) : 0;
    const passed = pct >= 70;
    const misses = records.filter((r) => r.pts < r.max);
    const topicsInSession = [...new Set(records.map((r) => r.qi))];
    return (
      <div style={page}>
        <style>{css}</style>
        <div style={col}>
          <div style={{ textAlign: "center", margin: "36px 0 20px" }}>
            <Eyebrow>判決</Eyebrow>
            <div style={{ display: "flex", justifyContent: "center", margin: "20px 0 16px" }}>
              <Stamp text={passed ? "合格" : "追試"} color={passed ? SHU : AI_BLUE} />
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{score}</div>
            <div style={{ fontFamily: SERIF, fontSize: 12.5, color: MUTED, marginTop: 6 }}>{sessionMax}点満点中({pct}%)</div>
            <p style={{ color: MUTED, fontSize: 13, marginTop: 10, lineHeight: 1.8 }}>
              本試験の合格ラインもおおむね7割。{passed ? "この調子です。" : "落とした肢を潰していきましょう。"}
            </p>
          </div>

          <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
            {topicsInSession.map((i, n) => {
              const rs = records.filter((r) => r.qi === i);
              const pts = rs.reduce((s, r) => s + r.pts, 0);
              const max = rs.reduce((s, r) => s + r.max, 0);
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 0", borderBottom: n < topicsInSession.length - 1 ? `1px solid ${LINE}` : "none", fontSize: 14.5 }}>
                  <div>
                    <b>{QUESTIONS[i].topic}</b>
                    <span style={{ color: MUTED, marginLeft: 8, fontSize: 11.5 }}>{QUESTIONS[i].law}({rs.length}肢)</span>
                  </div>
                  <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 15, fontVariantNumeric: "tabular-nums", color: pts === max ? GREEN : pts >= max * 0.6 ? INK : SHU }}>
                    {pts} / {max}
                  </div>
                </div>
              );
            })}
          </div>

          {misses.length > 0 && (
            <div style={{ ...card, marginBottom: 16, borderLeft: `4px solid ${SHU}` }}>
              <Eyebrow>要再審理</Eyebrow>
              <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 15, margin: "4px 0 8px" }}>取りこぼした肢({misses.length}肢)</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.9, color: MUTED }}>
                {misses.map((r, i) => (
                  <li key={i}>
                    <span style={{ color: INK }}>{QUESTIONS[r.qi].topic} — {QUESTIONS[r.qi].type === "calc" ? "計算" : QUESTIONS[r.qi].type === "spot" ? "広告" : `肢${r.ci + 1}`}</span>
                    <span style={{ fontFamily: SERIF, marginLeft: 8, color: SHU }}>{r.pts}/{r.max}点</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {misses.length > 0 && (
            <button
              onClick={startSessionMisses}
              style={{ width: "100%", padding: "15px 0", fontSize: 16, fontWeight: 700, fontFamily: SERIF, letterSpacing: 4, color: CARD, background: SHU, border: "none", borderRadius: 10, cursor: "pointer", marginBottom: 10 }}
            >
              落とした{misses.length}肢だけ、すぐ再戦
            </button>
          )}
          <button
            onClick={toTop}
            style={{ width: "100%", padding: "15px 0", fontSize: 16, fontWeight: 700, fontFamily: SERIF, letterSpacing: 3, color: misses.length > 0 ? INK : CARD, background: misses.length > 0 ? CARD : INK, border: misses.length > 0 ? `2px solid ${INK}` : "none", borderRadius: 10, cursor: "pointer" }}
          >
            出題範囲を選び直す
          </button>
        </div>
      </div>
    );
  }

  /* ================= PLAY ================= */
  const judged = judgePick !== null;
  const judgeCorrect = judgePick === choice.correct;

  return (
    <div style={page}>
      <style>{css}</style>
      <div style={col}>
        {/* 進捗 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div style={{ fontFamily: SERIF, fontSize: 15 }}>
            <b>第{idx + 1}肢</b>
            <span style={{ color: MUTED }}> / 全{sessionItems.length}肢</span>
            <span style={{ margin: "0 8px", color: LINE }}>|</span>
            <span style={{ fontSize: 13 }}>{q.topic}・{isCalc ? "計算" : isSpot ? "広告" : `肢${ci + 1}`}</span>
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 15 }}>
            <span style={{ color: MUTED, fontSize: 12 }}>通算 </span>
            <b>{score}<span style={{ fontSize: 12, color: MUTED }}>/{sessionMax}点</span></b>
          </div>
        </div>
        <div style={{ height: 4, background: LINE, borderRadius: 2, marginBottom: 24 }}>
          <div style={{ height: 4, width: `${sessionItems.length ? (idx / sessionItems.length) * 100 : 0}%`, background: SHU, borderRadius: 2, transition: "width .3s" }} />
        </div>

        {/* 事案 */}
        <div style={{ ...card, padding: "16px 20px", marginBottom: 8, position: "relative" }}>
          <Eyebrow>{q.category} — {q.topic}({q.law})</Eyebrow>
          <p style={{ fontFamily: SERIF, fontSize: 14, lineHeight: 1.9, margin: "8px 0 4px" }}>{termify(q.scenario, openTerm)}</p>
          {q.diagram && <Diagram data={q.diagram} />}
          {isCalc && (
            <>
              <p style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, lineHeight: 1.9, margin: "8px 0 10px" }}>
                {termify(q.calc.prompt, openTerm)}
              </p>
              <div style={{ borderTop: `1px solid ${LINE}` }}>
                {q.calc.given.map((g, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < q.calc.given.length - 1 ? `1px solid ${LINE}` : "none", fontSize: 13 }}>
                    <span style={{ color: MUTED }}>{g.label}</span>
                    <b style={{ fontFamily: SERIF }}>{termify(g.value, openTerm)}</b>
                  </div>
                ))}
              </div>
              {calcDone && (
                <div style={{ position: "absolute", top: 10, right: 14 }}>
                  <Stamp
                    text={records.find((r) => r.qi === qi && r.ci === ci)?.pts === 2 ? "正" : "誤"}
                    color={records.find((r) => r.qi === qi && r.ci === ci)?.pts === 2 ? SHU : MUTED}
                    small
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* 30秒レッスン */}
        <div style={{ ...card, marginBottom: 16, padding: 0, overflow: "hidden" }}>
          <button
            onClick={() => setLessonOpen(!lessonOpen)}
            style={{ width: "100%", textAlign: "left", padding: "12px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontSize: 13, fontWeight: 700, color: AI_BLUE, display: "flex", justifyContent: "space-between" }}
            aria-expanded={lessonOpen}
          >
            <span>30秒レッスン — ルールを予習してから挑む</span>
            <span>{lessonOpen ? "−" : "+"}</span>
          </button>
          {lessonOpen && (
            <ul style={{ margin: 0, padding: "0 20px 14px 36px", fontSize: 13.5, lineHeight: 1.85, color: INK }}>
              {q.lesson.map((l, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{termify(l, openTerm)}</li>
              ))}
            </ul>
          )}
        </div>

        {/* ============ calc: 途中式ビルダー ============ */}
        {isCalc && (
          <>
            {[0, 1].map((stepIdx) => {
              const step = q.calc.build[stepIdx];
              const picked = stepIdx === 0 ? calcF : calcT;
              const visible = stepIdx === 0 || calcF !== null;
              if (!visible) return null;
              return (
                <div key={stepIdx} className="fade-up" style={{ ...card, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <Eyebrow>{step.label}</Eyebrow>
                    <span style={{ fontSize: 12, color: SHU }}>+1点</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {step.options.map((o, i) => {
                      let border = LINE, bg = CARD, mark = "", markColor = MUTED;
                      if (calcDone) {
                        if (o.correct) { border = GREEN; bg = "rgba(61,122,85,0.08)"; mark = i === picked ? "正解" : "正解はこちら"; markColor = GREEN; }
                        else if (i === picked) { border = SHU; bg = "rgba(191,59,51,0.08)"; mark = "あなたの選択"; markColor = SHU; }
                      } else if (i === picked) {
                        border = AI_BLUE; bg = "rgba(51,85,126,0.07)"; mark = "選択中"; markColor = AI_BLUE;
                      }
                      const trapShown = calcDone && !o.correct && o.trap;
                      return (
                        <button
                          key={i}
                          className="opt-btn"
                          onClick={() => (stepIdx === 0 ? handleCalcF(i) : handleCalcT(i))}
                          style={{ textAlign: "left", minHeight: 48, padding: "11px 14px", borderRadius: 10, cursor: "pointer", background: bg, border: `2px solid ${border}`, color: INK, fontFamily: SANS }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                            <span style={{ fontFamily: SERIF, fontSize: 14.5, fontWeight: 700 }}>{o.formula}</span>
                            <span style={{ fontSize: 11, color: markColor, whiteSpace: "nowrap" }}>{mark}</span>
                          </div>
                          {trapShown && (
                            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4, paddingTop: 4, borderTop: `1px dotted ${LINE}` }}>
                              罠: {o.trap}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {calcDone && (() => {
              const fOk = q.calc.build[0].options[calcF].correct;
              const tOk = q.calc.build[1].options[calcT].correct;
              const pts = (fOk ? 1 : 0) + (tOk ? 1 : 0);
              const accent = pts === 2 ? GREEN : pts === 1 ? AI_BLUE : SHU;
              const msg = pts === 2 ? "式も税も正解。決着。" : pts === 0 ? "式も税も誤り。" : !fOk ? "税は正解。速算式が誤り。" : "式は正解。消費税の扱いが誤り。";
              const { line1, line2 } = calcResult();
              return (
                <div className="fade-up">
                  <div style={{ ...card, borderLeft: `4px solid ${accent}`, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <b style={{ fontSize: 14, color: accent }}>{msg}</b>
                      <span style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 18, color: INK, whiteSpace: "nowrap" }}>
                        +{pts}<span style={{ fontSize: 12, color: MUTED }}>/2点</span>
                      </span>
                    </div>
                    <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>
                      <div style={{ fontSize: 11, letterSpacing: 2.5, color: MUTED, marginBottom: 4 }}>あなたの組み立てた式</div>
                      <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, lineHeight: 1.9 }}>{line1}</div>
                      <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, lineHeight: 1.9 }}>{line2}</div>
                    </div>
                  </div>
                  <div style={{ ...card, marginBottom: 12 }}>
                    <div style={{ fontSize: 11, letterSpacing: 2.5, color: MUTED, marginBottom: 4 }}>正解の道筋</div>
                    {q.calc.canonical.map((st, i) => (
                      <div key={i} style={{ padding: "9px 0", borderBottom: i < q.calc.canonical.length - 1 ? `1px dotted ${LINE}` : "none" }}>
                        <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 2 }}>{st.label}</div>
                        <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700 }}>{st.formula}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={next}
                    style={{ width: "100%", padding: "15px 0", fontSize: 16, fontWeight: 700, fontFamily: SERIF, letterSpacing: 3, color: CARD, background: INK, border: "none", borderRadius: 10, cursor: "pointer" }}
                  >
                    {idx + 1 < sessionItems.length
                      ? sessionItems[idx + 1].qi === qi
                        ? "次の肢へ"
                        : "次の問題へ"
                      : "判決を聞く"}
                  </button>
                </div>
              );
            })()}
          </>
        )}

        {/* ============ spot: マイソク間違い探し ============ */}
        {isSpot && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "2px 4px 0" }}>
              <span style={{ fontFamily: SERIF, fontSize: 14 }}><b>証拠品</b></span>
              <span style={{ fontFamily: SERIF, fontSize: 14 }}>
                <span style={{ color: MUTED, fontSize: 12 }}>疑義 </span>
                <b style={{ color: SHU }}>{spotFound.length}</b>
                <span style={{ color: MUTED }}>/{q.spot.errorCount}</span>
                <span style={{ marginLeft: 8, fontSize: 12, color: spotWrong > 0 ? SHU : MUTED }}>誤指摘 {spotWrong}</span>
              </span>
            </div>

            <SpotAd found={spotFound} pending={spotPending} done={spotDone} onTap={handleSpotZone} />

            {spotPending && (
              <div className="fade-up" style={{ background: INK, color: CARD, borderRadius: 10, padding: "16px 18px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, letterSpacing: 2.5, color: "#9FB0BC", marginBottom: 6 }}>疑義申立て</div>
                <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, lineHeight: 1.8 }}>
                  「{q.spot.zones.find((z) => z.id === spotPending)?.name}」を広告規制違反として申し立てますか。
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button onClick={handleSpotAccuse} style={{ flex: 1, minHeight: 46, fontSize: 14, fontWeight: 700, fontFamily: SERIF, letterSpacing: 2, color: CARD, background: SHU, border: "none", borderRadius: 10, cursor: "pointer" }}>
                    申し立てる
                  </button>
                  <button onClick={handleSpotWithdraw} style={{ flex: 1, minHeight: 46, fontSize: 14, fontWeight: 700, fontFamily: SERIF, letterSpacing: 2, color: CARD, background: "transparent", border: "1px solid #5A6B77", borderRadius: 10, cursor: "pointer" }}>
                    取り下げる
                  </button>
                </div>
              </div>
            )}

            {spotMsg && !spotPending && (
              <div className="fade-up" style={{ ...card, borderLeft: `4px solid ${spotMsg.accent}`, marginBottom: 12, padding: "12px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: spotMsg.accent }}>{spotMsg.title}</div>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.7, marginTop: 2 }}>{spotMsg.body}</div>
              </div>
            )}

            {spotFound.length > 0 && (
              <div className="fade-up" style={{ ...card, borderLeft: `4px solid ${SHU}`, marginBottom: 12 }}>
                <div style={{ fontSize: 11, letterSpacing: 2.5, color: MUTED, marginBottom: 4 }}>調書 — 指摘事項</div>
                {spotFound.map((id, i) => {
                  const z = q.spot.zones.find((zz) => zz.id === id);
                  return (
                    <div key={id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < spotFound.length - 1 ? `1px dotted ${LINE}` : "none" }}>
                      <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: SHU, color: CARD, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF }}>{i + 1}</span>
                      <div>
                        <div style={{ fontFamily: SERIF, fontSize: 13.5, fontWeight: 700 }}>{z.name}</div>
                        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.7, marginTop: 2 }}>{z.reason}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {spotDone && (
              <div className="fade-up">
                <div style={{ ...card, borderLeft: `4px solid ${spotWrong === 0 ? GREEN : AI_BLUE}`, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b style={{ fontSize: 14, color: spotWrong === 0 ? GREEN : AI_BLUE }}>
                      {spotWrong === 0 ? "全違反を摘発。誤指摘なし。完璧。" : `全違反を摘発。ただし誤指摘 ${spotWrong} 件。`}
                    </b>
                    <span style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 18, color: INK, whiteSpace: "nowrap" }}>
                      +{Math.max(0, q.spot.errorCount - spotWrong)}<span style={{ fontSize: 12, color: MUTED }}>/{q.spot.errorCount}点</span>
                    </span>
                  </div>
                </div>
                <button
                  onClick={next}
                  style={{ width: "100%", padding: "15px 0", fontSize: 16, fontWeight: 700, fontFamily: SERIF, letterSpacing: 3, color: CARD, background: INK, border: "none", borderRadius: 10, cursor: "pointer" }}
                >
                  {idx + 1 < sessionItems.length
                    ? sessionItems[idx + 1].qi === qi
                      ? "次の肢へ"
                      : "次の問題へ"
                    : "判決を聞く"}
                </button>
              </div>
            )}
          </>
        )}

        {/* ============ zenshi: 肢カード ============ */}
        {isZenshi && (
        <div className="fade-up" key={`${qi}-${ci}`} style={{ ...card, padding: "20px 22px", position: "relative", marginBottom: 16 }}>
          <Eyebrow>肢 {ci + 1}</Eyebrow>
          <p style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 2.05, margin: "10px 0 4px" }}>
            {choice.segments.map((seg, i) => {
              const tappable = phase === "locate";
              const revealed = phase === "reason" || phase === "explain";
              const isWrongSeg = !choice.correct && i === choice.wrongIndex;
              const picked = locatePick === i;
              let styleSeg = {};
              if (tappable) {
                styleSeg = { borderBottom: `2px dotted ${AI_BLUE}`, cursor: "pointer", padding: "1px 1px" };
              }
              if (revealed && judgePick === false && !choice.correct) {
                if (isWrongSeg) styleSeg = { background: "rgba(191,59,51,0.14)", borderBottom: `2px solid ${SHU}`, padding: "1px 1px" };
                else if (picked) styleSeg = { background: "rgba(51,85,126,0.12)", padding: "1px 1px" };
              }
              return tappable ? (
                <button
                  key={i}
                  className="seg-btn"
                  onClick={() => handleLocate(i)}
                  style={{ ...styleSeg, font: "inherit", color: "inherit", background: "transparent", border: "none", borderBottom: styleSeg.borderBottom, textAlign: "left", lineHeight: "inherit" }}
                >
                  {seg}
                </button>
              ) : (
                <span key={i} style={styleSeg}>{termify(seg, openTerm)}</span>
              );
            })}
          </p>

          {/* 判定スタンプ */}
          {judged && (
            <div style={{ position: "absolute", top: 8, right: 14 }}>
              <Stamp text={judgePick ? "正" : "誤"} color={judgeCorrect ? SHU : MUTED} small />
            </div>
          )}
        </div>
        )}

        {/* ---- フェーズ別UI(zenshi) ---- */}
        {isZenshi && phase === "judge" && (
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => handleJudge(true)}
              style={{ flex: 1, padding: "18px 0", fontSize: 18, letterSpacing: 2, fontFamily: SERIF, fontWeight: 700, background: CARD, color: INK, border: `2px solid ${INK}`, borderRadius: 10, cursor: "pointer" }}
            >
              ◯ 正しい
            </button>
            <button
              onClick={() => handleJudge(false)}
              style={{ flex: 1, padding: "18px 0", fontSize: 18, letterSpacing: 2, fontFamily: SERIF, fontWeight: 700, background: CARD, color: SHU, border: `2px solid ${SHU}`, borderRadius: 10, cursor: "pointer" }}
            >
              ✕ 誤り
            </button>
          </div>
        )}

        {isZenshi && phase === "locate" && (
          <div className="fade-up" style={{ ...card, borderLeft: `4px solid ${SHU}` }}>
            <b style={{ fontSize: 14 }}>お見事、この肢は誤りです。</b>
            <p style={{ fontSize: 13.5, margin: "6px 0 0", color: MUTED }}>
              では、<b style={{ color: INK }}>どこが誤っているか</b>、上の文の該当箇所をタップしてください。(+1点)
            </p>
          </div>
        )}

        {isZenshi && phase === "reason" && (
          <div className="fade-up">
            {choice.correct ? (
              <div style={{ ...card, borderLeft: `4px solid ${GREEN}`, marginBottom: 12 }}>
                <b style={{ fontSize: 14, color: GREEN }}>判定正解。この肢は「正しい」。</b>
                <p style={{ fontSize: 13.5, margin: "6px 0 0", color: MUTED }}>
                  では、<b style={{ color: INK }}>なぜ正しいと言えるのか</b>、根拠を選んでください。(+1点)
                  <br />
                  <span style={{ fontSize: 12 }}>※ 結論が合っていても根拠が違うと、少しひねられた瞬間に落ちます。</span>
                </p>
              </div>
            ) : (
              <div style={{ ...card, borderLeft: `4px solid ${locatePick === choice.wrongIndex ? GREEN : SHU}`, marginBottom: 12 }}>
                <b style={{ fontSize: 14, color: locatePick === choice.wrongIndex ? GREEN : SHU }}>
                  {locatePick === choice.wrongIndex ? "箇所も正解。(+1点)" : "箇所は不正解。赤線部が誤りでした。"}
                </b>
                <p style={{ fontSize: 13.5, margin: "6px 0 0", color: MUTED }}>
                  仕上げです。<b style={{ color: INK }}>なぜ誤りなのか</b>、理由を選んでください。(+1点)
                </p>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {shuffledReasons.map((r, i) => (
                <button
                  key={i}
                  className="opt-btn"
                  onClick={() => handleReason(i)}
                  style={{ textAlign: "left", padding: "13px 16px", fontSize: 14, lineHeight: 1.7, background: CARD, border: `1.5px solid ${LINE}`, borderRadius: 10, cursor: "pointer", color: INK, fontFamily: SANS }}
                >
                  {r.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {isZenshi && phase === "explain" && (
          <div className="fade-up">
            <div style={{ ...card, borderLeft: `4px solid ${judgeCorrect ? GREEN : SHU}`, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <b style={{ fontSize: 15, color: judgeCorrect ? GREEN : SHU }}>
                  {!judgeCorrect
                    ? `判定ミス。この肢は「${choice.correct ? "正しい" : "誤り"}」でした。`
                    : reasonPick !== null && shuffledReasons[reasonPick]?.correct
                      ? choice.correct
                        ? "根拠まで正解。完璧です。"
                        : "理由まで正解。完璧です。"
                      : choice.correct
                        ? "判定は正解。ただし根拠が違いました。"
                        : "判定は正解。ただし理由が違いました。"}
                </b>
                <span style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 18, color: INK, whiteSpace: "nowrap" }}>
                  +{currentPts()}<span style={{ fontSize: 12, color: MUTED }}>/{choice.correct ? 2 : 3}点</span>
                </span>
              </div>
              {reasonPick !== null && !shuffledReasons[reasonPick]?.correct && (
                <p style={{ fontSize: 13, margin: "0 0 8px", color: MUTED }}>
                  正しい{choice.correct ? "根拠" : "理由"}: <span style={{ color: INK }}>{termify(choice.reasons.find((r) => r.correct).text, openTerm)}</span>
                </p>
              )}
              <p style={{ fontSize: 14, lineHeight: 1.9, margin: 0 }}>{termify(choice.explanation, openTerm)}</p>
            </div>
            <button
              onClick={next}
              style={{ width: "100%", padding: "15px 0", fontSize: 16, fontWeight: 700, fontFamily: SERIF, letterSpacing: 3, color: CARD, background: INK, border: "none", borderRadius: 10, cursor: "pointer" }}
            >
              {idx + 1 < sessionItems.length
                ? sessionItems[idx + 1].qi === qi
                  ? "次の肢へ"
                  : "次の問題へ"
                : "判決を聞く"}
            </button>
          </div>
        )}

        {/* 用語辞書ポップアップ */}
        {activeTerm && (
          <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", padding: "0 16px 16px", zIndex: 50, pointerEvents: "none" }}>
            <div className="fade-up" style={{ width: "100%", maxWidth: 560, background: INK, color: CARD, borderRadius: 12, padding: "14px 18px 16px", boxShadow: "0 10px 28px rgba(38,51,59,0.35)", pointerEvents: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <b style={{ fontFamily: SERIF, fontSize: 16, letterSpacing: 1 }}>{activeTerm}</b>
                <button
                  onClick={() => setActiveTerm(null)}
                  aria-label="用語の説明を閉じる"
                  style={{ background: "none", border: "none", color: CARD, fontSize: 16, cursor: "pointer", padding: "0 2px" }}
                >
                  ✕
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.8, color: "#E4E2DB" }}>{TERMS[activeTerm]}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

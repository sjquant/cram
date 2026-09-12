# Share a Cram quiz

English | [한국어](sharing.ko.md)

Cram produces a self-contained HTML file. Send that file to a friend, or host
it as a static website so they can open a link. No application server, database,
or build step is needed.

## Pick a sharing method

For a quick upload, try Netlify Drop or Vercel Drop. For a collection you plan
to keep updating, consider Cloudflare Pages or GitHub Pages.

The services below have published hosting documentation and free-plan terms.
This is a practical shortlist, not an uptime audit or a guarantee of permanent
free hosting. Terms checked on **2026-09-12**; follow the linked sources for updates.

| Service | How you publish | Free-plan considerations |
| --- | --- | --- |
| [Cloudflare Pages](https://developers.cloudflare.com/pages/get-started/direct-upload/) | Sign in and upload a folder or ZIP; no Git repository required. | [Static asset requests are free and unlimited](https://developers.cloudflare.com/pages/functions/pricing/). [Individual files are limited to 25 MiB](https://developers.cloudflare.com/pages/platform/limits/). |
| [Netlify Drop](https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/) | Drop a folder and claim/manage the project with an account. | [Free includes 300 credits/month](https://www.netlify.com/pricing/), shared by deploys and traffic. Check project visibility before sharing; some projects start private. |
| [Vercel Drop](https://vercel.com/docs/drop) | Sign in and drop an HTML file, folder, or ZIP. | [Hobby is free for personal, non-commercial use](https://vercel.com/docs/plans/hobby). Each drop creates a new project, rather than updating the old one. |
| [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) | Upload the HTML to your repository and enable Pages. | [GitHub Free supports Pages from public repositories](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). Suitable if you already use GitHub and want version history. |
| [Surge](https://surge.sh/) | Publish a local folder using its command-line tool. | [Free includes unlimited publishing and basic SSL](https://surge.sh/pricing). Password protection is paid. An option for people who prefer a terminal or agent-assisted deployment. |

These are optional hosting choices, not Cram integrations or endorsements.
You can also use a sharing feature in your existing tools if it serves the
complete HTML and allows its JavaScript to run. A file preview alone may not
run the quiz.

## Prepare the file

1. Keep your original quiz and make a copy named `index.html`.
2. Put the copy in a new folder containing only the files you intend to publish.
   Cram needs just this HTML file; do not upload your entire workspace.
3. Open the copy locally to check it, then upload it using one of the options below.

Using `index.html` makes the quiz the site's home page. You can keep a name
such as `study.html` instead, but may need to share the full `/study.html` URL.

## Upload without a terminal

### Cloudflare Pages

Create or sign in to a Cloudflare account. In **Workers & Pages**, choose the
Pages **Direct Upload / drag-and-drop** flow, name the project, and upload your
folder or ZIP. Deploy it and share the generated `pages.dev` URL.
To replace the quiz, create a new deployment in the same project.
[Official upload guide](https://developers.cloudflare.com/pages/get-started/direct-upload/)

### Netlify Drop

Sign in to Netlify, open [Netlify Drop](https://app.netlify.com/drop), and drop
your folder. Make the project public if needed, then share its `netlify.app`
URL. To update it, upload the replacement folder in that project's deployment
area. Uploading anonymously initially uses temporary password protection;
use an account to claim and manage it.
[Official upload and visibility guide](https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/)

### Vercel Drop

Sign in and open [Vercel Drop](https://vercel.com/drop). Upload the HTML or
folder, choose your account/team and project name, and deploy. If you kept a
filename other than `index.html`, select it as the home page when prompted.
Each new drop creates a separate project; use the project's other deployment
methods when you need to update an existing URL.
[Official Drop guide](https://vercel.com/docs/drop)

### GitHub Pages

Create a public repository for the quizzes you want to publish. Upload
`index.html` to its root, then open **Settings → Pages** and select deployment
from the branch and root folder containing the file. Share the site URL shown
by Pages after deployment finishes. Commit an updated HTML file to update it.
[Official setup guide](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

## Before sending the link

Generated quizzes include the deck title and a localized description in the
HTML's page metadata, Open Graph tags, and Twitter summary-card tags. Crawlers
can read these without running JavaScript. An image preview is not included:
it needs a separately hosted image with a public HTTP/HTTPS URL. Base64 data
URLs are not suitable for `og:image`; the [Open Graph URL type](https://ogp.me/)
requires HTTP or HTTPS. Cram also omits `og:url` because the final hosting
address is unknown when the file is created. Preview appearance and caching
depend on the service where you share the link.

Open it in a private browser window to check that your friend can access it
without your hosting login. Try revealing an answer and moving to the next card.
Your friend needs internet access to load the hosted quiz; the original HTML
file can still be opened offline.

Public hosting publishes the questions **and answers** embedded in the HTML.
An obscure link is not access control. For private notes or internal material,
send the file through an appropriate private channel or use hosting with access
controls. The host receives the uploaded file even when access is restricted.

Scores and progress stay in each learner's browser when storage is available;
hosting does not add shared scores, a leaderboard, or cross-device sync. Progress
from a local file does not automatically follow it to a hosted URL. Keep the
original HTML so you can move it if a hosting service changes its terms.

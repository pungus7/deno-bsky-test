import { BskyAgent } from '@atproto/api'

const agent = new BskyAgent({
    service: 'https://bsky.social'
})

export async function post(urlLink?: string, dateString: string, postText: string, userName: string, userPassword: string) {
    const postDate = new Date(dateString).toISOString();
    if (!urlLink) {
        return attemptPost();
    }

    const pdsUrl = "https://bsky.social";
    let bskyUri: string = "";

    await getURI(urlLink);

    function getURI(url: string) {
        const regex = /https:\/\/bsky\.app\/profile\/([^\/]+)\/post\/([^\/]+)/;
        const match = url.match(regex);

        if (match) {
            const user = match[1];
            const id = match[2];
            bskyUri = `at://${user}/app.bsky.feed.post/${id}`;
        } else {
            throw new Error("Invalid URL");
        }
    }

    interface Reply {
        root: {
            uri: string;
            cid: string;
        };
        parent: {
            uri: string;
            cid: string;
        };
    }

    async function getReplyRefs(parentUri: string): Promise<Reply> {
        const uriParts = parseUri(parentUri);

        const parent = await fetchRecord(uriParts);
        const parentReply = parent.value.reply;

        const root = parentReply
        ? await fetchRecord(parseUri(parentReply.root.uri))
        : parent;

        return {
            root: {
                uri: root.uri,
                cid: root.cid,
            },
            parent: {
                uri: parent.uri,
                cid: parent.cid,
            },
        };
    }

    async function fetchRecord(params: Record<string, string>) {
        const response = await fetch(`${pdsUrl}/xrpc/com.atproto.repo.getRecord?${new URLSearchParams(params)}`);
        if (!response.ok) {
            throw new Error(`Error fetching record: ${response.statusText}`);
        }
        return await response.json();
    }

    function parseUri(uri: string): Record<string, string> {
        const parts = uri.split("/");
        if (parts.length < 5) {
            throw new Error("Invalid URI format");
        }
        const [repo, collection, rkey] = parts.slice(2, 5);
        return { repo, collection, rkey };
    }

    async function attemptPost() {
        await agent.login({
            identifier: userName,
            password: userPassword,
        });

        if (!urlLink) {
            await agent.post({
                text: postText,
                createdAt: postDate
            });
            return;
        }

        const postData = await getReplyRefs(bskyUri);

        await agent.post({
            text: postText,
            reply: {
                root: {
                    uri: postData.root.uri,
                    cid: postData.root.cid,
                },
                parent: {
                    uri: postData.parent.uri,
                    cid: postData.parent.cid,
                }
            },
            createdAt: postDate
        })
    }

    attemptPost();
}

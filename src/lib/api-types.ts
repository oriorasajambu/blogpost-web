export interface paths {
    "/health/live": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getLiveness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getReadiness"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/meta": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getApiMeta"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/public/posts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listPublicPosts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/public/posts/{postId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getPublicPost"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/public/posts/by-slug/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["resolvePublicPostSlug"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/public/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["searchPublicPosts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/public/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listPublicCategories"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/public/tags": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listPublicTags"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/public/authors/{handle}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getPublicAuthor"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/public/posts/availability": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["checkPublicPostAvailability"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/public/posts/{postId}/media/{mediaId}/{variant}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getPublicPostMedia"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/web-session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["createWebSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getMe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["updateMe"];
        trace?: never;
    };
    "/v1/invitations/accept": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["acceptInvitation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listWorkspacePosts"];
        put?: never;
        post: operations["createPost"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/by-client-draft-id/{clientDraftId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getPostByClientDraftId"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getWorkspacePost"];
        put?: never;
        post?: never;
        delete: operations["trashPost"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}/draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["savePostDraft"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["submitPostForReview"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}/withdraw-review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["withdrawPostReview"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}/reject": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["rejectPostRevision"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["publishPostRevision"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}/unpublish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["unpublishPost"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}/revisions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listPostRevisions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}/revisions/{revisionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getPostRevision"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}/review-events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listPostReviewEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}/restore-revision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["restorePostRevision"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["restoreTrashedPost"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}/slug": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["changePostSlug"];
        trace?: never;
    };
    "/v1/posts/{postId}/media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["stagePostMedia"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}/media/{mediaId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getPostMediaMetadata"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/posts/{postId}/media/{mediaId}/{variant}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getPrivatePostMedia"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listManagedCategories"];
        put?: never;
        post: operations["createCategory"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/categories/{categoryId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getManagedCategory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["updateCategory"];
        trace?: never;
    };
    "/v1/tags": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listManagedTags"];
        put?: never;
        post: operations["createTag"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/tags/{tagId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getManagedTag"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["updateTag"];
        trace?: never;
    };
    "/v1/admin/members": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listMembers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/members/{memberId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getMember"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["updateMember"];
        trace?: never;
    };
    "/v1/admin/posts/{postId}/author": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["reassignPostAuthor"];
        trace?: never;
    };
    "/v1/admin/invitations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listInvitations"];
        put?: never;
        post: operations["createInvitation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/invitations/{invitationId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getInvitation"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/invitations/{invitationId}/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["revokeInvitation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/invitations/{invitationId}/reissue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["reissueInvitation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/admin/audit-events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listAuditEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** Format: uuid */
        UUID: string;
        /** Format: date-time */
        DateTime: string;
        Version: number;
        /** @enum {string} */
        Role: "AUTHOR" | "EDITOR" | "ADMIN";
        /** @enum {string} */
        PublicationState: "NEVER_PUBLISHED" | "PUBLISHED" | "WITHDRAWN";
        /** @enum {string} */
        WorkflowState: "DRAFT" | "IN_REVIEW" | "CHANGES_REQUESTED" | "CLEAN";
        /** @enum {string} */
        VariantName: "w480" | "w960" | "w1600";
        /** @enum {string} */
        InvitationStatus: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
        AuthorSummary: {
            /** Format: uuid */
            id: string;
            handle: string;
            displayName: string;
        };
        PublicAuthor: {
            /** Format: uuid */
            id: string;
            handle: string;
            displayName: string;
            bio: string;
        };
        Taxon: {
            /** Format: uuid */
            id: string;
            name: string;
            slug: string;
            active: boolean;
        };
        MediaVariant: {
            name: components["schemas"]["VariantName"];
            apiPath: string;
            width: number;
            height: number;
            /** @enum {string} */
            mimeType: "image/jpeg" | "image/png" | "image/webp";
            byteSize: number;
        };
        MediaDescriptor: {
            /** Format: uuid */
            mediaId: string;
            width: number;
            height: number;
            /** @enum {string} */
            mimeType: "image/jpeg" | "image/png" | "image/webp";
            variants: components["schemas"]["MediaVariant"][] & (unknown & unknown & unknown);
        };
        ImageReference: {
            /** Format: uuid */
            mediaId: string;
            width: number;
            height: number;
            /** @enum {string} */
            mimeType: "image/jpeg" | "image/png" | "image/webp";
            variants: components["schemas"]["MediaVariant"][] & (unknown & unknown & unknown);
            altText: string;
            decorative: boolean;
        } & unknown;
        PublicPostSummary: {
            /** Format: uuid */
            id: string;
            slug: string;
            title: string;
            summary: string;
            author: components["schemas"]["AuthorSummary"];
            category: components["schemas"]["Taxon"];
            tags: components["schemas"]["Taxon"][];
            cover: components["schemas"]["ImageReference"] | null;
            /** Format: uuid */
            publishedRevisionId: string;
            /** Format: date-time */
            firstPublishedAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        PublicPost: {
            /** Format: uuid */
            id: string;
            slug: string;
            title: string;
            summary: string;
            author: components["schemas"]["AuthorSummary"];
            category: components["schemas"]["Taxon"];
            tags: components["schemas"]["Taxon"][];
            cover: components["schemas"]["ImageReference"] | null;
            /** Format: uuid */
            publishedRevisionId: string;
            /** Format: date-time */
            firstPublishedAt: string;
            /** Format: date-time */
            updatedAt: string;
            /** @description Maximum 131072 UTF-8 bytes. Markdown contract 1. Images use media://UUID, never external URLs. */
            markdown: string;
            /** @constant */
            markdownContractVersion: 1;
            media: components["schemas"]["MediaDescriptor"][];
        };
        DraftContentInput: {
            title: string;
            summary: string;
            /** @description Maximum 131072 UTF-8 bytes. Markdown contract 1. Images use media://UUID, never external URLs. */
            markdown: string;
            categoryId: string | null;
            tagIds: string[];
            coverMediaId: string | null;
            /**
             * @default 1
             * @constant
             */
            markdownContractVersion: 1;
            /** @default null */
            coverAltText: string | null;
            /** @default false */
            coverDecorative: boolean;
        };
        DraftContent: {
            title: string;
            summary: string;
            /** @description Maximum 131072 UTF-8 bytes. Markdown contract 1. Images use media://UUID, never external URLs. */
            markdown: string;
            categoryId: string | null;
            tagIds: string[];
            coverMediaId: string | null;
            /**
             * @default 1
             * @constant
             */
            markdownContractVersion: 1;
            /** @default null */
            coverAltText: string | null;
            /** @default false */
            coverDecorative: boolean;
        };
        RevisionSummary: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            postId: string;
            number: number;
            title: string;
            createdBy: components["schemas"]["AuthorSummary"];
            /** Format: date-time */
            createdAt: string;
        };
        Revision: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            postId: string;
            number: number;
            createdBy: components["schemas"]["AuthorSummary"];
            /** Format: date-time */
            createdAt: string;
            creditedAuthor: components["schemas"]["AuthorSummary"];
            content: components["schemas"]["DraftContent"];
            media: components["schemas"]["MediaDescriptor"][];
            restoredFromRevisionId: string | null;
        };
        ReviewFeedback: {
            /** Format: uuid */
            revisionId: string;
            actor: components["schemas"]["AuthorSummary"];
            text: string;
            /** Format: date-time */
            createdAt: string;
        };
        ReviewState: {
            submittedRevisionId: string | null;
            submittedAt: string | null;
            lastFeedback: components["schemas"]["ReviewFeedback"] | null;
        };
        WorkspacePostSummary: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            clientDraftId: string;
            author: components["schemas"]["AuthorSummary"];
            slug: string | null;
            publicationState: components["schemas"]["PublicationState"];
            workflowState: components["schemas"]["WorkflowState"];
            version: number;
            workingRevisionId: string | null;
            publishedRevisionId: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
            trashedAt: string | null;
            purgeAfter: string | null;
            allowedActions: string[];
        };
        WorkspacePost: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            clientDraftId: string;
            author: components["schemas"]["AuthorSummary"];
            slug: string | null;
            publicationState: components["schemas"]["PublicationState"];
            workflowState: components["schemas"]["WorkflowState"];
            version: number;
            workingRevisionId: string | null;
            publishedRevisionId: string | null;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
            trashedAt: string | null;
            purgeAfter: string | null;
            allowedActions: string[];
            workingRevision: components["schemas"]["Revision"] | null;
            publishedRevision: components["schemas"]["Revision"] | null;
            review: components["schemas"]["ReviewState"];
        };
        ReviewEvent: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            postId: string;
            /** Format: uuid */
            revisionId: string;
            action: string;
            actor: components["schemas"]["AuthorSummary"];
            /** Format: date-time */
            createdAt: string;
            feedback: string | null;
        };
        Me: {
            /** Format: uuid */
            id: string;
            handle: string;
            displayName: string;
            bio: string;
            /** Format: email */
            email: string;
            role: components["schemas"]["Role"];
            active: boolean;
            version: number;
        };
        AdminMember: {
            /** Format: uuid */
            id: string;
            handle: string;
            displayName: string;
            bio: string;
            /** Format: email */
            email: string;
            role: components["schemas"]["Role"];
            active: boolean;
            version: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        ManagedTaxon: {
            /** Format: uuid */
            id: string;
            name: string;
            slug: string;
            active: boolean;
            version: number;
            usage: {
                publishedCount: number;
                draftCount: number;
            };
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        Invitation: {
            /** Format: uuid */
            id: string;
            /** Format: email */
            email: string;
            role: components["schemas"]["Role"];
            status: components["schemas"]["InvitationStatus"];
            version: number;
            issuedBy: components["schemas"]["AuthorSummary"];
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            expiresAt: string;
            acceptedAt: string | null;
            revokedAt: string | null;
        };
        InvitationIssueResult: {
            invitation: components["schemas"]["Invitation"];
            inviteUrl: string | null;
            linkAvailable: boolean;
        };
        MediaAsset: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            postId: string;
            /** @constant */
            ready: true;
            width: number;
            height: number;
            /** @enum {string} */
            mimeType: "image/jpeg" | "image/png" | "image/webp";
            variants: components["schemas"]["MediaVariant"][] & (unknown & unknown & unknown);
            /** Format: date-time */
            createdAt: string;
            unattachedExpiresAt: string | null;
        };
        AvailabilityItem: {
            /** Format: uuid */
            postId: string;
            available: boolean;
            publishedRevisionId: string | null;
        } & unknown;
        SlugResolution: {
            /** @enum {string} */
            resolution: "CANONICAL" | "REDIRECT";
            canonicalSlug: string;
            canonicalPath: string;
            post: components["schemas"]["PublicPost"] | null;
        } & unknown;
        AuditEvent: {
            /** Format: uuid */
            id: string;
            actor: components["schemas"]["AuthorSummary"];
            action: string;
            subjectType: string;
            /** Format: uuid */
            subjectId: string;
            /** Format: date-time */
            createdAt: string;
            changes: Record<string, never>;
        };
        WebSession: {
            /** @description Credential for the server proxy only; never forward this JSON to a browser or log it. */
            sessionCookie: string;
            /** Format: date-time */
            expiresAt: string;
            member: components["schemas"]["Me"];
        };
        ApiLimits: {
            /** @constant */
            defaultPageSize: 20;
            /** @constant */
            maxPageSize: 50;
            /** @constant */
            defaultTaxonomyPageSize: 50;
            /** @constant */
            maxSearchResults: 1000;
            /** @constant */
            maxMarkdownBytes: 131072;
            /** @constant */
            maxJsonBodyBytes: 1048576;
            /** @constant */
            maxUploadFileBytes: 5242880;
            /** @constant */
            maxMultipartBodyBytes: 6291456;
            /** @constant */
            maxImagePixels: 12000000;
            /** @constant */
            maxTagsPerPost: 5;
            /** @constant */
            maxAvailabilityIds: 50;
            /** @constant */
            maxActivePostsPerMember: 100;
            /** @constant */
            maxPendingUploadBytesPerMember: 104857600;
            /** @constant */
            idempotencyTtlSeconds: 86400;
            /** @constant */
            unattachedMediaTtlSeconds: 86400;
            /** @constant */
            invitationTtlSeconds: 604800;
        };
        ApiMeta: {
            /** @constant */
            apiMajor: 1;
            contractVersion: string;
            /** @constant */
            markdownContractVersion: 1;
            buildSha: string;
            features: string[];
            limits: components["schemas"]["ApiLimits"];
            clients: {
                web: {
                    recommendedVersion: string;
                    minimumSupportedVersion: string | null;
                };
                android: {
                    recommendedVersion: string;
                    minimumSupportedVersion: string | null;
                };
            };
            lifecycle: {
                /** @enum {string} */
                status: "ACTIVE" | "DEPRECATED" | "RETIRED";
                successorApiMajor: number | null;
                noticePublishedAt: string | null;
                deprecatedAt: string | null;
                sunsetAt: string | null;
                migrationGuidePath: string | null;
            };
            deployment?: {
                environment: string;
                revision: string | null;
                runtimeInputDigest: string;
                configurationDigest: string;
            };
        };
        FieldIssue: {
            /** @enum {string} */
            location: "header" | "path" | "query" | "body";
            field: string;
            code: string;
            params: Record<string, never>;
        };
        ApiError: {
            code: string;
            fieldErrors: components["schemas"]["FieldIssue"][];
            context: Record<string, never> | null;
        };
        CursorPagination: {
            /** @constant */
            kind: "CURSOR";
            pageSize: number;
            hasMore: boolean;
            nextCursor: string | null;
        };
        PagePagination: {
            /** @constant */
            kind: "PAGE";
            page: number;
            pageSize: number;
            totalItems: number;
            totalPages: number;
            hasMore: boolean;
            truncated: boolean;
        };
        IdempotencyMeta: {
            replayed: boolean;
            /** Format: date-time */
            expiresAt: string;
        };
        ResponseMeta: {
            contractVersion: string;
            pagination: (components["schemas"]["CursorPagination"] | components["schemas"]["PagePagination"]) | null;
            idempotency: components["schemas"]["IdempotencyMeta"] | null;
        };
        Health: {
            /** @enum {string} */
            status: "ok" | "unavailable";
        };
        EmptyInput: Record<string, never>;
        WebSessionInput: {
            idToken: string;
        };
        UpdateMeInput: {
            displayName?: string;
            bio?: string | null;
        };
        AcceptInvitationInput: {
            /** @description Base64url encoding of a random 256-bit secret. */
            token: string;
        };
        AvailabilityInput: {
            postIds: string[];
        };
        CreatePostInput: {
            /** Format: uuid */
            clientDraftId: string;
            draft: components["schemas"]["DraftContentInput"];
        };
        RevisionActionInput: {
            /** Format: uuid */
            revisionId: string;
        };
        RejectRevisionInput: {
            /** Format: uuid */
            revisionId: string;
            feedback: string;
        };
        ChangeSlugInput: {
            slug: string;
        };
        CreateTaxonInput: {
            name: string;
            slug: string;
        };
        UpdateTaxonInput: {
            name?: string;
            active?: boolean;
        };
        UpdateMemberInput: {
            role?: components["schemas"]["Role"];
            active?: boolean;
        };
        ReassignAuthorInput: {
            /** Format: uuid */
            authorId: string;
        };
        CreateInvitationInput: {
            /** Format: email */
            email: string;
            role: components["schemas"]["Role"];
        };
        StageMediaInput: {
            /**
             * Format: binary
             * @description One JPEG, PNG or WebP file; encoded file <= 5242880 bytes, complete multipart <= 6291456 bytes; decoded <= 12000000 pixels, single frame.
             */
            file: string;
        };
        MetaEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["ApiMeta"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        ErrorEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "ERROR";
            statusCode: number;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: null;
            error: components["schemas"]["ApiError"];
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"] | null;
            };
        };
        ListPublicPostsEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["PublicPostSummary"][];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: components["schemas"]["CursorPagination"];
                idempotency: null;
            };
        };
        GetPublicPostEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["PublicPost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        ResolvePublicPostSlugEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["SlugResolution"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        SearchPublicPostsEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["PublicPostSummary"][];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: components["schemas"]["PagePagination"];
                idempotency: null;
            };
        };
        ListPublicCategoriesEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["Taxon"][];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: components["schemas"]["PagePagination"];
                idempotency: null;
            };
        };
        ListPublicTagsEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["Taxon"][];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: components["schemas"]["PagePagination"];
                idempotency: null;
            };
        };
        GetPublicAuthorEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["PublicAuthor"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        CheckPublicPostAvailabilityEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["AvailabilityItem"][];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        CreateWebSessionEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WebSession"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        GetMeEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["Me"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        UpdateMeEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["Me"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        AcceptInvitationEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["Me"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        ListWorkspacePostsEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePostSummary"][];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: components["schemas"]["CursorPagination"];
                idempotency: null;
            };
        };
        CreatePostEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 201;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        GetPostByClientDraftIdEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        GetWorkspacePostEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        SavePostDraftEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        SubmitPostForReviewEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        WithdrawPostReviewEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        RejectPostRevisionEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        PublishPostRevisionEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        UnpublishPostEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        ListPostRevisionsEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["RevisionSummary"][];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: components["schemas"]["CursorPagination"];
                idempotency: null;
            };
        };
        GetPostRevisionEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["Revision"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        ListPostReviewEventsEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["ReviewEvent"][];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: components["schemas"]["CursorPagination"];
                idempotency: null;
            };
        };
        RestorePostRevisionEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        TrashPostEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        RestoreTrashedPostEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        ChangePostSlugEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        StagePostMediaEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 201;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["MediaAsset"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        GetPostMediaMetadataEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["MediaAsset"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        ListManagedCategoriesEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["ManagedTaxon"][];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: components["schemas"]["PagePagination"];
                idempotency: null;
            };
        };
        GetManagedCategoryEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["ManagedTaxon"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        CreateCategoryEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 201;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["ManagedTaxon"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        UpdateCategoryEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["ManagedTaxon"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        ListManagedTagsEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["ManagedTaxon"][];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: components["schemas"]["PagePagination"];
                idempotency: null;
            };
        };
        GetManagedTagEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["ManagedTaxon"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        CreateTagEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 201;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["ManagedTaxon"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        UpdateTagEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["ManagedTaxon"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        ListMembersEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["AdminMember"][];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: components["schemas"]["CursorPagination"];
                idempotency: null;
            };
        };
        GetMemberEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["AdminMember"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        UpdateMemberEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["AdminMember"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        ReassignPostAuthorEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["WorkspacePost"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        ListInvitationsEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["Invitation"][];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: components["schemas"]["CursorPagination"];
                idempotency: null;
            };
        };
        GetInvitationEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["Invitation"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: null;
            };
        };
        CreateInvitationEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 201;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["InvitationIssueResult"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        RevokeInvitationEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["Invitation"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        ReissueInvitationEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 201;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["InvitationIssueResult"];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: null;
                idempotency: components["schemas"]["IdempotencyMeta"];
            };
        };
        ListAuditEventsEnvelope: {
            /** Format: date-time */
            timestamp: string;
            /** @constant */
            responseKey: "SUCCESS";
            /** @constant */
            statusCode: 200;
            traceId: string;
            message: {
                title: string;
                descriptions: string;
            };
            data: components["schemas"]["AuditEvent"][];
            error: null;
            meta: {
                /** @constant */
                contractVersion: "1.0.0";
                pagination: components["schemas"]["CursorPagination"];
                idempotency: null;
            };
        };
    };
    responses: {
        /** @description INVALID_CLIENT_METADATA, MALFORMED_JSON, INVALID_CURSOR, INVALID_IDEMPOTENCY_KEY, INVALID_EXPECTED_VERSION, AMBIGUOUS_CREDENTIALS */
        Error400: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description AUTHENTICATION_REQUIRED, INVALID_CREDENTIAL, AUTHENTICATION_EXPIRED */
        Error401: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description RESOURCE_NOT_FOUND, INVITATION_INVALID */
        Error404: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description METHOD_NOT_ALLOWED */
        Error405: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                Allow?: string;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description API_VERSION_RETIRED */
        Error410: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description PAYLOAD_TOO_LARGE, UPLOAD_TOO_LARGE */
        Error413: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description UNSUPPORTED_MEDIA_TYPE */
        Error415: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description VALIDATION_FAILED, MARKDOWN_UNSUPPORTED, SEARCH_QUERY_NOT_SEARCHABLE */
        Error422: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description RATE_LIMITED */
        Error429: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                /** @description Delay in seconds when retry is appropriate; in-progress writes preserve key/input. */
                "Retry-After"?: string;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description INTERNAL_ERROR */
        Error500: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description DEPENDENCY_UNAVAILABLE */
        Error503: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                /** @description Delay in seconds when retry is appropriate; in-progress writes preserve key/input. */
                "Retry-After"?: string;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description UPSTREAM_TIMEOUT */
        Error504: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description INSUFFICIENT_PERMISSION, ACCESS_REVOKED, INVITATION_ACCOUNT_MISMATCH, CSRF_VALIDATION_FAILED */
        Error403: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description WORKFLOW_CONFLICT, SLUG_CONFLICT, LAST_ADMIN_REQUIRED, MEMBER_ALREADY_EXISTS, CLIENT_DRAFT_ALREADY_EXISTS, IDEMPOTENCY_KEY_REUSED, IDEMPOTENCY_IN_PROGRESS, RESOURCE_QUOTA_EXCEEDED */
        Error409: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                /** @description Delay in seconds when retry is appropriate; in-progress writes preserve key/input. */
                "Retry-After"?: string;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description VERSION_CONFLICT */
        Error412: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description EXPECTED_VERSION_REQUIRED */
        Error428: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description INVITATION_EXPIRED, INVITATION_USED, INVITATION_REVOKED, API_VERSION_RETIRED */
        Error410Invitation: {
            headers: {
                /** @description Matches the envelope traceId. */
                "X-Trace-ID"?: string;
                "X-API-Contract-Version"?: "1.0.0";
                "Cache-Control"?: "no-store";
                "X-Content-Type-Options"?: "nosniff";
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
    };
    parameters: {
        /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
        "X-Device-ID": string;
        /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
        "X-Device-OS": string;
        /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
        "X-Device-Version": string & unknown;
        /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
        "X-App-Version": string;
        /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
        "X-App-Language": string;
        /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
        ExpectedVersion: string;
        /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
        IdempotencyKey: string;
        /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
        Traceparent: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getLiveness: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Healthy */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "status": "ok"
                     *     }
                     */
                    "application/json": components["schemas"]["Health"];
                };
            };
        };
    };
    getReadiness: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Healthy */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "status": "ok"
                     *     }
                     */
                    "application/json": components["schemas"]["Health"];
                };
            };
            /** @description SQL unavailable or incompatible schema */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "status": "unavailable"
                     *     }
                     */
                    "application/json": components["schemas"]["Health"];
                };
            };
        };
    };
    getApiMeta: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description ApiMeta */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MetaEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    listPublicPosts: {
        parameters: {
            query?: {
                cursor?: string;
                pageSize?: number;
                categoryId?: string;
                authorId?: string;
                /** @description Repeated tagIds values use AND semantics. */
                tagIds?: string[];
            };
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Array of PublicPostSummary */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListPublicPostsEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    getPublicPost: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description PublicPost */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetPublicPostEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    resolvePublicPostSlug: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description SlugResolution */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResolvePublicPostSlugEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    searchPublicPosts: {
        parameters: {
            query: {
                page?: number;
                pageSize?: number;
                categoryId?: string;
                authorId?: string;
                /** @description Repeated tagIds values use AND semantics. */
                tagIds?: string[];
                q: string;
            };
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Array of PublicPostSummary */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SearchPublicPostsEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    listPublicCategories: {
        parameters: {
            query?: {
                page?: number;
                pageSize?: number;
            };
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Array of Taxon */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListPublicCategoriesEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    listPublicTags: {
        parameters: {
            query?: {
                page?: number;
                pageSize?: number;
            };
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Array of Taxon */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListPublicTagsEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    getPublicAuthor: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                handle: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description PublicAuthor */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetPublicAuthorEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    checkPublicPostAvailability: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AvailabilityInput"];
            };
        };
        responses: {
            /** @description Array of AvailabilityItem */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CheckPublicPostAvailabilityEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    getPublicPostMedia: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                postId: string;
                mediaId: string;
                variant: components["schemas"]["VariantName"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Validated image bytes; access checked on every request. */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "image/jpeg": string;
                    "image/png": string;
                    "image/webp": string;
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    createWebSession: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WebSessionInput"];
            };
        };
        responses: {
            /** @description WebSession */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreateWebSessionEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    getMe: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Me */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetMeEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    updateMe: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateMeInput"];
            };
        };
        responses: {
            /** @description Me */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateMeEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    acceptInvitation: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AcceptInvitationInput"];
            };
        };
        responses: {
            /** @description Me */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AcceptInvitationEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410Invitation"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    listWorkspacePosts: {
        parameters: {
            query?: {
                cursor?: string;
                pageSize?: number;
                scope?: "OWN" | "ALL";
                publicationState?: components["schemas"]["PublicationState"];
                workflowState?: components["schemas"]["WorkflowState"];
                trashed?: boolean;
            };
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Array of WorkspacePostSummary */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListWorkspacePostsEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    createPost: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreatePostInput"];
            };
        };
        responses: {
            /** @description WorkspacePost */
            201: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    /** @description Backend-relative path of the created resource. */
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreatePostEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    getPostByClientDraftId: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                clientDraftId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description WorkspacePost */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetPostByClientDraftIdEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    getWorkspacePost: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description WorkspacePost */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetWorkspacePostEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    trashPost: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description WorkspacePost */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrashPostEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    savePostDraft: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DraftContentInput"];
            };
        };
        responses: {
            /** @description WorkspacePost */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SavePostDraftEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    submitPostForReview: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RevisionActionInput"];
            };
        };
        responses: {
            /** @description WorkspacePost */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmitPostForReviewEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    withdrawPostReview: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmptyInput"];
            };
        };
        responses: {
            /** @description WorkspacePost */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WithdrawPostReviewEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    rejectPostRevision: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RejectRevisionInput"];
            };
        };
        responses: {
            /** @description WorkspacePost */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RejectPostRevisionEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    publishPostRevision: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RevisionActionInput"];
            };
        };
        responses: {
            /** @description WorkspacePost */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublishPostRevisionEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    unpublishPost: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmptyInput"];
            };
        };
        responses: {
            /** @description WorkspacePost */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UnpublishPostEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    listPostRevisions: {
        parameters: {
            query?: {
                cursor?: string;
                pageSize?: number;
            };
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Array of RevisionSummary */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListPostRevisionsEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    getPostRevision: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                postId: string;
                revisionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Revision */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetPostRevisionEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    listPostReviewEvents: {
        parameters: {
            query?: {
                cursor?: string;
                pageSize?: number;
            };
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Array of ReviewEvent */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListPostReviewEventsEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    restorePostRevision: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RevisionActionInput"];
            };
        };
        responses: {
            /** @description WorkspacePost */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RestorePostRevisionEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    restoreTrashedPost: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmptyInput"];
            };
        };
        responses: {
            /** @description WorkspacePost */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RestoreTrashedPostEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    changePostSlug: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangeSlugInput"];
            };
        };
        responses: {
            /** @description WorkspacePost */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ChangePostSlugEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    stagePostMedia: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["StageMediaInput"];
            };
        };
        responses: {
            /** @description MediaAsset */
            201: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Backend-relative path of the created resource. */
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StagePostMediaEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    getPostMediaMetadata: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                postId: string;
                mediaId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description MediaAsset */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetPostMediaMetadataEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    getPrivatePostMedia: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                postId: string;
                mediaId: string;
                variant: components["schemas"]["VariantName"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Validated image bytes; access checked on every request. */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "image/jpeg": string;
                    "image/png": string;
                    "image/webp": string;
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    listManagedCategories: {
        parameters: {
            query?: {
                page?: number;
                pageSize?: number;
                active?: boolean;
            };
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Array of ManagedTaxon */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListManagedCategoriesEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    createCategory: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTaxonInput"];
            };
        };
        responses: {
            /** @description ManagedTaxon */
            201: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    /** @description Backend-relative path of the created resource. */
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreateCategoryEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    getManagedCategory: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                categoryId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description ManagedTaxon */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetManagedCategoryEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    updateCategory: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                categoryId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateTaxonInput"];
            };
        };
        responses: {
            /** @description ManagedTaxon */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateCategoryEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    listManagedTags: {
        parameters: {
            query?: {
                page?: number;
                pageSize?: number;
                active?: boolean;
            };
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Array of ManagedTaxon */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListManagedTagsEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    createTag: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTaxonInput"];
            };
        };
        responses: {
            /** @description ManagedTaxon */
            201: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    /** @description Backend-relative path of the created resource. */
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreateTagEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    getManagedTag: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                tagId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description ManagedTaxon */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetManagedTagEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    updateTag: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                tagId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateTaxonInput"];
            };
        };
        responses: {
            /** @description ManagedTaxon */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateTagEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    listMembers: {
        parameters: {
            query?: {
                cursor?: string;
                pageSize?: number;
                role?: components["schemas"]["Role"];
                active?: boolean;
            };
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Array of AdminMember */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListMembersEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    getMember: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                memberId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description AdminMember */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetMemberEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    updateMember: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                memberId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateMemberInput"];
            };
        };
        responses: {
            /** @description AdminMember */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UpdateMemberEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    reassignPostAuthor: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                postId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReassignAuthorInput"];
            };
        };
        responses: {
            /** @description WorkspacePost */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReassignPostAuthorEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    listInvitations: {
        parameters: {
            query?: {
                cursor?: string;
                pageSize?: number;
                status?: components["schemas"]["InvitationStatus"];
            };
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Array of Invitation */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListInvitationsEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    createInvitation: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateInvitationInput"];
            };
        };
        responses: {
            /** @description InvitationIssueResult */
            201: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    /** @description Backend-relative path of the created resource. */
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreateInvitationEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    getInvitation: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path: {
                invitationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Invitation */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetInvitationEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    revokeInvitation: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                invitationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmptyInput"];
            };
        };
        responses: {
            /** @description Invitation */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RevokeInvitationEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410Invitation"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    reissueInvitation: {
        parameters: {
            query?: never;
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
                /** @description Committed resource version. Missing 428; malformed 400; stale 412. Replay follows current authorization and precedes current-version checks. */
                "X-Expected-Version": components["parameters"]["ExpectedVersion"];
                /** @description UUID v4. Scope: identity UID + method + path + key. Semantic input includes expected version, excludes credentials/device/trace. Successful results replay for 24 hours. */
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                invitationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmptyInput"];
            };
        };
        responses: {
            /** @description InvitationIssueResult */
            201: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    /** @description Committed version, including the original version on replay. No workspace version on public snapshots. */
                    "X-Resource-Version"?: string;
                    /** @description Backend-relative path of the created resource. */
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ReissueInvitationEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410Invitation"];
            412: components["responses"]["Error412"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            428: components["responses"]["Error428"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
    listAuditEvents: {
        parameters: {
            query?: {
                cursor?: string;
                pageSize?: number;
                subjectType?: string;
                subjectId?: string;
                action?: string;
            };
            header: {
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-ID": components["parameters"]["X-Device-ID"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-OS": components["parameters"]["X-Device-OS"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. */
                "X-Device-Version": components["parameters"]["X-Device-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. Strict SemVer with optional build metadata. */
                "X-App-Version": components["parameters"]["X-App-Version"];
                /** @description Required exactly once, including anonymous/media requests. No blank/control/comma-joined values. Probe and CORS preflight are exempt. One well-formed BCP 47 language tag, including valid unsupported languages. */
                "X-App-Language": components["parameters"]["X-App-Language"];
                /** @description W3C trace context. Invalid/all-zero context is replaced, never used for authorization. */
                traceparent?: components["parameters"]["Traceparent"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Array of AuditEvent */
            200: {
                headers: {
                    /** @description Matches the envelope traceId. */
                    "X-Trace-ID"?: string;
                    "X-API-Contract-Version"?: "1.0.0";
                    "Cache-Control"?: "no-store";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListAuditEventsEnvelope"];
                };
            };
            400: components["responses"]["Error400"];
            401: components["responses"]["Error401"];
            403: components["responses"]["Error403"];
            404: components["responses"]["Error404"];
            405: components["responses"]["Error405"];
            409: components["responses"]["Error409"];
            410: components["responses"]["Error410"];
            413: components["responses"]["Error413"];
            415: components["responses"]["Error415"];
            422: components["responses"]["Error422"];
            429: components["responses"]["Error429"];
            500: components["responses"]["Error500"];
            503: components["responses"]["Error503"];
            504: components["responses"]["Error504"];
        };
    };
}

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE public.users (
      id uuid NOT NULL,
      username character varying(32) NOT NULL,
      email character varying(64) NOT NULL,
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      updated_at timestamp without time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE public.categories (
      id uuid NOT NULL,
      user_id uuid NOT NULL,
      name character varying(64) NOT NULL,
      description text,
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      updated_at timestamp without time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE public.posts (
      id uuid NOT NULL,
      user_id uuid NOT NULL,
      category_id uuid NOT NULL,
      title character varying(128) NOT NULL,
      body text NOT NULL,
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      updated_at timestamp without time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE public.comments (
      id uuid NOT NULL,
      user_id uuid NOT NULL,
      post_id uuid NOT NULL,
      parent_id uuid,
      body text NOT NULL,
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      updated_at timestamp without time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE public.votes (
      id uuid NOT NULL,
      user_id uuid NOT NULL,
      post_id uuid,
      comment_id uuid,
      value smallint NOT NULL,
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      CONSTRAINT comment_or_post_id_must_exist CHECK (
        ((post_id IS NOT NULL) AND (comment_id IS NULL)) OR
        ((post_id IS NULL) AND (comment_id IS NOT NULL))
      )
    );

    ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
    ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);
    ALTER TABLE ONLY public.users ADD CONSTRAINT users_username_key UNIQUE (username);

    ALTER TABLE ONLY public.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
    ALTER TABLE ONLY public.categories ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

    ALTER TABLE ONLY public.posts ADD CONSTRAINT posts_pkey PRIMARY KEY (id);
    ALTER TABLE ONLY public.posts ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
    ALTER TABLE ONLY public.posts ADD CONSTRAINT posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);

    ALTER TABLE ONLY public.comments ADD CONSTRAINT comments_pkey PRIMARY KEY (id);
    ALTER TABLE ONLY public.comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
    ALTER TABLE ONLY public.comments ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id);
    ALTER TABLE ONLY public.comments ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id);

    ALTER TABLE ONLY public.votes ADD CONSTRAINT votes_pkey PRIMARY KEY (id);
    ALTER TABLE ONLY public.votes ADD CONSTRAINT votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
    ALTER TABLE ONLY public.votes ADD CONSTRAINT votes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id);
    ALTER TABLE ONLY public.votes ADD CONSTRAINT votes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id);

    CREATE UNIQUE INDEX one_user_vote_per_post ON public.votes USING btree (user_id, post_id) WHERE (post_id IS NOT NULL);
    CREATE UNIQUE INDEX one_user_vote_per_comment ON public.votes USING btree (user_id, comment_id) WHERE (comment_id IS NOT NULL);
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS votes, comments, posts, categories, users CASCADE;`);
};

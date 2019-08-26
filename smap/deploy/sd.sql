-- 
-- Apply upgrade patches to survey definitions database
--

-- Upgrade to 19.09+
alter table task_group add column complete_all boolean;

CREATE SEQUENCE style_seq START 1;
ALTER SEQUENCE style_seq OWNER TO ws;

create TABLE style (
	id integer default nextval('style_seq') constraint pk_style primary key,
	s_ident text REFERENCES survey(ident) ON DELETE CASCADE,
	name text,
	style text	-- json
	);
ALTER TABLE style OWNER TO ws;

alter table question add column style_id integer default 0;
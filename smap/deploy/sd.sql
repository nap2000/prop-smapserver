-- 
-- Apply upgrade patches to survey definitions database
--

-- Upgrade to 19.09+
alter table task_group add column complete_all boolean;

CREATE SEQUENCE style_seq START 1;
ALTER SEQUENCE style_seq OWNER TO ws;

create TABLE style (
	id integer default nextval('style_seq') constraint pk_style primary key,
	s_id integer REFERENCES survey(s_id) ON DELETE CASCADE,
	name text,
	style text	-- json
	);
ALTER TABLE style OWNER TO ws;

alter table question add column style_id integer default 0;
alter table question add column server_calculate text;

alter table last_refresh add column 	device_time TIMESTAMP WITH TIME ZONE;

CREATE SEQUENCE last_refresh_log_seq START 1;
ALTER SEQUENCE last_refresh_log_seq OWNER TO ws;

create TABLE last_refresh_log (
	id integer default nextval('last_refresh_log_seq') constraint pk_last_refresh_log primary key,
	o_id integer,
	user_ident text,
	refresh_time TIMESTAMP WITH TIME ZONE,
	device_time TIMESTAMP WITH TIME ZONE
	);
ALTER TABLE last_refresh_log OWNER TO ws;

alter table group_survey add column f_name text;

update question set source = null where qtype = 'server_calculate' and source is not null;

alter table organisation add column training text;

alter table users drop constraint users_o_id_fkey;

alter table organisation add column ft_prevent_disable_track boolean default false;

-- Duplicates are allowed
drop index record_event_key;

alter table task_group add column assign_auto boolean;
alter table tasks add column assign_auto boolean;

CREATE SEQUENCE task_rejected_seq START 1;
ALTER TABLE task_rejected_seq OWNER TO ws;

CREATE TABLE public.task_rejected (
	id integer DEFAULT nextval('task_rejected_seq') NOT NULL PRIMARY KEY,
	a_id integer REFERENCES assignments(id),    -- assignment id
	ident text,		 -- user identifier
	rejected_at timestamp with time zone
);
ALTER TABLE public.task_rejected OWNER TO ws;
CREATE UNIQUE INDEX taskRejected ON task_rejected(a_id, ident);

insert into groups(id,name) values(10,'view own data');
insert into groups(id,name) values(11,'manage tasks');

alter table forward add column update_survey text references survey(ident) on delete cascade;
alter table forward add column update_question text;
alter table forward add column update_value text;

alter table survey add column data_survey boolean default true;
alter table survey add column oversight_survey boolean default true;

SELECT AddGeometryColumn('last_refresh_log', 'geo_point', 4326, 'POINT', 2);

-- Opt In to emails
-- Default to true for existing email addresses
alter table people add column opted_in boolean;
alter table people add column opted_in_sent TIMESTAMP WITH TIME ZONE;
alter table people add column opted_in_count integer default 0;
alter table people add column opted_in_status text;
alter table people add column opted_in_status_msg text;
update people set opted_in = 'true' where opted_in is null;

CREATE SEQUENCE pending_message_seq START 1;
ALTER SEQUENCE pending_message_seq OWNER TO ws;

create TABLE pending_message (
	id integer DEFAULT NEXTVAL('pending_message_seq') CONSTRAINT pk_pending_message PRIMARY KEY,
	o_id integer REFERENCES organisation(id) ON DELETE CASCADE,
	email text,
	topic text,
	description text,
	data text,
	created_time TIMESTAMP WITH TIME ZONE,
	processed_time TIMESTAMP WITH TIME ZONE,
	status text
);
CREATE index pending_message_email ON pending_message(email);
ALTER TABLE pending_message OWNER TO ws;

alter table question add column set_value text;
alter table people add column name text;

create unique index idx_people on people(o_id, email);

alter table organisation add column send_optin boolean default true;

-- Mailout
CREATE SEQUENCE mailout_seq START 1;
ALTER SEQUENCE mailout_seq OWNER TO ws;

create TABLE mailout (
	id integer default nextval('mailout_seq') constraint pk_mailout primary key,
	survey_ident text,				-- Survey in mail out
	name text,						-- Name for the mail out
	content text,
	subject text,
	created TIMESTAMP WITH TIME ZONE,
	modified TIMESTAMP WITH TIME ZONE
	);
CREATE UNIQUE INDEX idx_mailout_name ON mailout(survey_ident, name);
ALTER TABLE mailout OWNER TO ws;

CREATE SEQUENCE mailout_people_seq START 1;
ALTER SEQUENCE mailout_people_seq OWNER TO ws;

create TABLE mailout_people (
	id integer default nextval('mailout_people_seq') constraint pk_mailout_people primary key,
	p_id integer references people(id) on delete cascade,		-- People ID
	m_id integer references mailout(id) on delete cascade,		-- Mailout Id,
	status text,		-- Mailout status
	status_details text,
	initial_data text,
	processed TIMESTAMP WITH TIME ZONE,		-- Time converted into a message
	status_updated TIMESTAMP WITH TIME ZONE	
	);
CREATE UNIQUE INDEX idx_mailout_people ON mailout_people(p_id, m_id);	
ALTER TABLE mailout_people OWNER TO ws;

-- Final status of temporary user
CREATE SEQUENCE temp_users_final_seq START 1;
ALTER SEQUENCE temp_users_final_seq OWNER TO ws;

CREATE TABLE temp_users_final (
	id INTEGER DEFAULT NEXTVAL('temp_users_final_seq') CONSTRAINT pk_temp_users_final PRIMARY KEY,
	ident text,
	status text,
	created timestamp with time zone
	);
CREATE UNIQUE INDEX idx_temp_users_final_ident ON temp_users_final(ident);
ALTER TABLE temp_users_final OWNER TO ws;

alter table mailout_people add column link text;

alter table tasks alter column deleted set default false;
alter table pending_message add column message_id integer;

CREATE INDEX idx_up_u ON user_project(u_id);

alter table project add column imported boolean default false;
alter table users add column imported boolean default false;
alter table upload_event add column temporary_user boolean default false;
update upload_event set temporary_user = 'false' where temporary_user is null;

-- Transcribe
CREATE SEQUENCE aws_async_jobs_seq START 1;
ALTER SEQUENCE aws_async_jobs_seq OWNER TO ws;

-- Aynchronous AWS jobs deposit the data in an S3 bucket
-- This S3 object is the definitive and full results and a link to it
-- will be retaine in the sync table
create TABLE aws_async_jobs (
	id integer DEFAULT NEXTVAL('aws_async_jobs_seq') CONSTRAINT pk_aws_async_jobs PRIMARY KEY,
	o_id integer,
	col_name text,			-- Question that initiated this request
	table_name text,		-- Table containing the data
	instanceid text,		-- Record identifier
	type text,				-- AUTO_UPDATE_AUDIO ||
	update_details text,	-- AutoUpdate object in JSON
	job text,				-- Unique AWS job identifier
	status text,			-- open || pending || complete || error
	results_link text,			-- URI to job results
	request_initiated TIMESTAMP WITH TIME ZONE,
	request_completed TIMESTAMP WITH TIME ZONE
);
ALTER TABLE aws_async_jobs OWNER TO ws;

alter table language add column code text;
alter table language add column rtl boolean default false; 
alter table log add column measure integer default 0;
alter table role add column imported boolean default false;
alter table organisation add column limits text;

CREATE SEQUENCE resource_usage_seq START 1;
ALTER SEQUENCE resource_usage_seq OWNER TO ws;

create TABLE resource_usage (
	id integer DEFAULT NEXTVAL('resource_usage_seq') CONSTRAINT pk_resource_usage PRIMARY KEY,
	o_id integer,
	period text,			-- year - month
	resource text,			-- Resource identifier
	usage integer			-- Amount of usage
);
ALTER TABLE resource_usage OWNER TO ws;

CREATE SEQUENCE language_codes_seq START 1;
ALTER SEQUENCE language_codes_seq OWNER TO ws;

create TABLE language_codes (
	id integer DEFAULT NEXTVAL('language_codes_seq') CONSTRAINT pk_language_codes PRIMARY KEY,
	code text,
	aws_translate boolean,			-- set yes if supported by translate
	aws_transcribe boolean,			-- set yes if supported by trancribe
	transcribe_default boolean		-- true if this is the default language o use for transcribe
);
ALTER TABLE language_codes OWNER TO ws;
create unique index idx_language_codes_code on language_codes(code);

alter table survey add column auto_translate boolean default false;

alter table form add column append boolean default false;

CREATE INDEX idx_question_param ON question (parameters) WHERE (parameters is not null);

alter table aws_async_jobs add column duration integer;
alter table aws_async_jobs add column locale text;

update organisation set limits = '{"transcribe":250,"submissions":0,"rekognition":100,"translate":5000}' where limits is null;
update organisation set limits = '{"transcribe":250,"submissions":0,"rekognition":100,"translate":5000}' where limits = '{"transcribe":500,"submissions":0,"rekognition":100,"translate":5000}'

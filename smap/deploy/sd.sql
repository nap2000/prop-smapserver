-- 
-- Apply upgrade patches to survey definitions database
--

-- Upgrade to:  13.08 from 13.07 =======
alter table tasks add column existing_record integer;

-- Upgrade to:  13.09 from 13.08 =======
-- None

-- Upgrade to:  13.10 from 13.09 =======
alter table upload_event add column form_status text;
alter table survey alter column blocked set default false;
update survey set blocked = 'false' where blocked is null;

-- Upgrade to:  13.11 from 13.10 =======
-- None

-- Upgrade to:  13.12 from 13.11 =======
alter table dashboard_settings add column ds_date_question_id INTEGER;
alter table dashboard_settings add column ds_time_group text;
alter table dashboard_settings add column ds_from_date date;
alter table dashboard_settings add column ds_to_date date;
alter table dashboard_settings add column ds_q_is_calc boolean default false;
alter table survey add column def_lang text;

CREATE SEQUENCE ssc_seq START 1;
ALTER SEQUENCE ssc_seq OWNER TO ws;

CREATE TABLE ssc (
	id INTEGER DEFAULT NEXTVAL('ssc_seq') CONSTRAINT pk_ssc PRIMARY KEY,
	s_id INTEGER REFERENCES survey ON DELETE CASCADE,
	f_id INTEGER,
	name text,
	type text,
	function text,
	parameters text
	);
ALTER TABLE ssc OWNER TO ws;
CREATE UNIQUE INDEX SscName ON ssc(s_id, name);

-- Upgrade to:  14.02 from 14.01 =======
insert into groups(id,name) values(4,'org admin');
alter table organisation add column changed_by text;
alter table organisation add column changed_ts TIMESTAMP WITH TIME ZONE;

-- Upgrade to:  14.03 from 14.02 =======
CREATE SEQUENCE forward_seq START 1;
ALTER SEQUENCE forward_seq OWNER TO ws;

CREATE TABLE forward (
	id INTEGER DEFAULT NEXTVAL('forward_seq') CONSTRAINT pk_forward PRIMARY KEY,
	s_id INTEGER REFERENCES survey ON DELETE CASCADE,
	enabled boolean,
	remote_s_id text,
	remote_s_name text,
	remote_user text,
	remote_password text,
	remote_host text
	);
ALTER TABLE forward OWNER TO ws;
CREATE UNIQUE INDEX ForwardDest ON forward(s_id, remote_s_id, remote_host);

ALTER TABLE subscriber_event alter column subscriber type text;
ALTER TABLE subscriber_event add column dest text;
ALTER TABLE upload_event add column orig_survey_ident text;
ALTER TABLE upload_event add column file_path text;

-- Upgrade to:  14.04 from 14.03 =======
ALTER TABLE forward alter column remote_s_id type text;

-- Upgrade to:  14.05 from 14.04 =======
ALTER TABLE upload_event add column update_id varchar(41);
ALTER TABLE ssc add column units varchar(20);
ALTER TABLE survey add column class varchar(10);
ALTER TABLE dashboard_settings add column ds_filter text;

CREATE SEQUENCE regions_seq START 10;
ALTER SEQUENCE regions_seq OWNER TO ws;

create TABLE regions (
	id INTEGER DEFAULT NEXTVAL('regions_seq') CONSTRAINT pk_regions PRIMARY KEY,
	o_id INTEGER REFERENCES organisation(id) ON DELETE CASCADE,
	table_name text,
	region_name text,
	geometry_column text
	);
ALTER TABLE regions OWNER TO ws;

-- INSERT into regions (o_id, table_name, region_name, geometry_column)
--	SELECT DISTINCT 1, f_table_name, f_table_name, f_geometry_column FROM geometry_columns 
--	WHERE type='MULTIPOLYGON' or type='POLYGON';
	
-- Upgrade to:  14.08 from 14.05 =======

-- Make deleting of surveys flow through to deleting of tasks
alter table tasks alter column form_id type integer using (form_id::integer);
delete from tasks where form_id not in (select s_id from survey);
alter table tasks drop constraint if exists tasks_form_id_fkey;
alter table tasks add foreign key (form_id) references survey(s_id) on delete cascade;

-- Changes for survey editor:
-- alter table question add column list_name text;
-- update question set list_name = qname where list_name is null and qtype like 'select%';
alter table translation alter column t_id set DEFAULT NEXTVAL('t_seq');

-- Add survey editing and versioning

alter table survey add column version integer;
update survey set version = 1 where version is null;

CREATE SEQUENCE sc_seq START 1;
ALTER SEQUENCE sc_seq OWNER TO ws;

CREATE TABLE survey_change (
	c_id integer DEFAULT NEXTVAL('sc_seq') CONSTRAINT pk_survey_changes PRIMARY KEY,
	s_id integer REFERENCES survey ON DELETE CASCADE,				
		
	version integer,							
	changes text,								
												
	user_id integer,							
	updated_time TIMESTAMP WITH TIME ZONE		
	);
ALTER TABLE survey_change OWNER TO ws;

-- Add survey ident to identify surveys rather than using the survey id
alter table survey add column ident text;
CREATE UNIQUE INDEX SurveyKey ON survey(ident);
alter table upload_event add column ident text;
update survey set ident = s_id where ident is null;

alter table users add column current_survey_id integer;
alter table users add column language varchar(10);

-- Add administrator email
alter table organisation add column admin_email text;

-- Upgrade to:  14.09 from 14.08 =======

alter table survey add column model text;
alter table organisation add column can_edit boolean;

CREATE SEQUENCE form_downloads_id_seq START 1;
ALTER TABLE form_downloads_id_seq OWNER TO ws;

CREATE TABLE public.form_downloads (
	id integer DEFAULT nextval('form_downloads_id_seq') NOT NULL PRIMARY KEY,
	u_id integer REFERENCES users(id) ON DELETE CASCADE,
	form_ident text REFERENCES survey(ident) ON DELETE CASCADE,
	form_version text,
	device_id text,
	updated_time TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.form_downloads OWNER TO ws;

CREATE UNIQUE INDEX idx_organisation ON organisation(name);

-- Upgrade to:  14.10.2 from 14.09 =======
alter table users add column one_time_password varchar(36);
alter table users add column one_time_password_expiry timestamp;

alter table upload_event add column incomplete boolean default false;
update upload_event set incomplete = 'false';

-- Upgrade to:  14.11.1 from 14.10.2 =======
alter table organisation add column ft_delete_submitted boolean;
alter table organisation add column ft_send_trail boolean;

CREATE SEQUENCE task_completion_id_seq START 1;
ALTER TABLE task_completion_id_seq OWNER TO ws;

CREATE TABLE public.task_completion (
	id integer DEFAULT nextval('task_completion_id_seq') NOT NULL PRIMARY KEY,
	u_id integer REFERENCES users(id) ON DELETE CASCADE,
	form_ident text REFERENCES survey(ident) ON DELETE CASCADE,
	form_version int,
	device_id text,
	uuid text,		-- Unique identifier for the results
	completion_time TIMESTAMP WITH TIME ZONE
);
SELECT AddGeometryColumn('task_completion', 'the_geom', 4326, 'POINT', 2);
ALTER TABLE public.task_completion OWNER TO ws;

CREATE SEQUENCE user_trail_id_seq START 1;
ALTER TABLE user_trail_id_seq OWNER TO ws;

CREATE TABLE public.user_trail (
	id integer DEFAULT nextval('user_trail_id_seq') NOT NULL PRIMARY KEY,
	u_id integer REFERENCES users(id) ON DELETE CASCADE,
	device_id text,
	event_time TIMESTAMP WITH TIME ZONE
);
SELECT AddGeometryColumn('user_trail', 'the_geom', 4326, 'POINT', 2);
ALTER TABLE public.user_trail OWNER TO ws;

update users set email = null where trim(email) = '';

alter table assignments drop constraint assignee;
alter table assignments add constraint assignee FOREIGN KEY (assignee)
	REFERENCES users (id) MATCH SIMPLE
	ON UPDATE NO ACTION ON DELETE CASCADE;

-- Upgrade to:  14.12 from 14.11 =======
alter table upload_event add column notifications_applied boolean;
alter table upload_event add column instanceid varchar(41);
alter table forward add column target text;
alter table forward add column notify_details text;
update forward set target = 'forward' where target is null;
alter table organisation add column smtp_host text;

-- Create notification_log table
CREATE SEQUENCE notification_log_seq START 1;
ALTER SEQUENCE notification_log_seq OWNER TO ws;

CREATE TABLE public.notification_log (
	id integer default nextval('notification_log_seq') not null PRIMARY KEY,
	o_id integer,
	notify_details text,
	status text,
	status_details text,
	event_time TIMESTAMP WITH TIME ZONE
	);
ALTER TABLE notification_log OWNER TO ws;

-- Create organisation level table
create TABLE server (
	smtp_host text
	);
ALTER TABLE server OWNER TO ws;

-- Upgrade to:  15.01 from 14.12 =======

-- Changes required for updating surveys via loading a csv file
ALTER TABLE option add column externalfile boolean default false;
ALTER TABLE survey_change add column apply_results boolean default false;
ALTER TABLE survey add column manifest text;

-- Changes required to Tasks page
ALTER TABLE task_group add column p_id integer;

-- Upgrade to: 15.03 from 15.02
alter table organisation add column email_domain text;
alter table server add column email_domain text;

-- Create the dynamic users for webform submission
CREATE SEQUENCE dynamic_users_seq START 1;
ALTER SEQUENCE dynamic_users_seq OWNER TO ws;

CREATE TABLE dynamic_users (
	id INTEGER DEFAULT NEXTVAL('dynamic_users_seq') CONSTRAINT pk_dynamic_users PRIMARY KEY,
	u_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
	survey_ident text,
	access_key varchar(41)
	);
ALTER TABLE dynamic_users OWNER TO ws;

-- Class in survey too small
alter table survey alter column class set data type text;

-- User configuration for PDF reports
alter table users add column settings text;
alter table users add column signature text;
alter table users drop constraint if exists users_email_key;
alter table organisation add column company_name text;
alter table organisation add column default_email_content text;

-- Upgrade to: 15.04 from 15.03
alter table survey add column task_file boolean;
alter table upload_event add column assignment_id integer;
alter table notification_log add column p_id integer;
alter table notification_log add column s_id integer;
alter table server add column email_user text;
alter table server add column email_password text;
alter table server add column email_port integer;
alter table organisation add column email_user text;
alter table organisation add column email_password text;
alter table organisation add column email_port integer;

-- Upgrade to: 15.09 from 15.04
drop index if exists formid_sequence ;
alter table question alter column qname set not null;
alter table question alter column visible set default 'true';
alter table question alter column mandatory set default 'false';
alter table question alter column readonly set default 'false';
alter table question alter column enabled set default 'true';
update question set visible = 'true' where visible is null;
update question set mandatory = 'false' where mandatory is null;
update question set readonly = 'false' where readonly is null;
update question set enabled = 'true' where enabled is null;

-- Starting to add the column_name explicitely to question
alter table question add column column_name text;
update question set column_name = lower(qname) where column_name is null;

-- Zarkman Inspector
alter table dynamic_users add column expiry timestamp;
alter table organisation add column ft_sync_incomplete boolean;
alter table tasks add column update_id text;
alter table project add column description text;

-- Logging errors from user devices
CREATE SEQUENCE log_report_seq START 1;
ALTER TABLE log_report_seq OWNER TO ws;

CREATE TABLE public.log_report (
	id integer DEFAULT nextval('log_report_seq') NOT NULL PRIMARY KEY,
	u_id integer REFERENCES users(id) ON DELETE CASCADE,
	device_id text,
	report text,
	upload_time TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.log_report OWNER TO ws;

-- Repeating instances
alter table tasks add column repeat boolean;

-- Generating reports
alter table organisation add column company_address text;
alter table organisation add column company_phone text;
alter table organisation add column company_email text;

-- Upgrade to: 15.10 from 15.09
alter table survey add column instance_name text;

-- Upgrade to: 15.11 from 15.10
update form set parentform = 0 where parentform is null;
alter table form alter column parentform set default 0;
alter table form alter column parentform set not null;
update form set parentquestion = 0 where parentquestion is null;
alter table form alter column parentquestion set default 0;
alter table form alter column parentquestion set not null;
alter table form add column form_index int default -1;

CREATE SEQUENCE l_seq START 1;
ALTER SEQUENCE l_seq OWNER TO ws;	

CREATE TABLE language (
	id INTEGER DEFAULT NEXTVAL('l_seq') CONSTRAINT pk_language PRIMARY KEY,
	s_id INTEGER REFERENCES survey ON DELETE CASCADE,
	seq integer,
	language text	
	);
ALTER TABLE language OWNER TO ws;

---------------------------------------------------------------------------------------
-- Add list name table
CREATE SEQUENCE l_seq START 1;
ALTER SEQUENCE l_seq OWNER TO ws;

CREATE TABLE listname (
	l_id integer default nextval('l_seq') constraint pk_listname primary key,
	s_id integer references survey on delete cascade, 
	name text
	);
ALTER TABLE listname OWNER TO ws;
CREATE UNIQUE INDEX listname_name ON listname(s_id, name);

drop index if exists q_id_sequence;
alter table option drop constraint if exists option_q_id_fkey;
alter table option add column l_id integer references listname on delete cascade;
alter table question add column l_id integer default 0;

insert into listname (s_id, name) select f.s_id, f.s_id || f.name || '_' || q.qname from question q, form f where q.qtype like 'select%' and q.f_id = f.f_id;
update option set l_id = sq.l_id from (select l.l_id, q.q_id from listname l, question q, form f where l.name = f.s_id || f.name || '_' || q.qname and f.f_id = q.f_id) as sq where sq.q_id = option.q_id and option.l_id is null;
update question set l_id = sq.l_id from (select l_id, q_id, o_id from option) as sq where sq.q_id = question.q_id and question.l_id = 0;
update question set l_id = 0 where l_id is null;

-------------
alter table survey_change add column success boolean default false;
alter table survey_change add column msg text;
update survey_change set success = true where success='false' and apply_results = true;
--------------
alter table question add column published boolean;
update question set published = true where published is null;
alter table question alter column published set default false;

alter table option add column published boolean;
update option set published = true where published is null;
alter table option alter column published set default false;

alter table question add column soft_deleted boolean default false;	 --set true if a question is deleted but not removed as there is a column in the results for this question
create unique index qname_index ON question(f_id,qname) where soft_deleted = 'false';
--------------
alter table option add column column_name text;
alter table question add column column_name_applied boolean default false;	-- Temporary column to ensure column name patches are only applied once
--------------- 
CREATE SEQUENCE map_seq START 1;
ALTER SEQUENCE map_seq OWNER TO ws;

create TABLE map (
	id INTEGER DEFAULT NEXTVAL('map_seq') CONSTRAINT pk_maps PRIMARY KEY,
	o_id INTEGER REFERENCES organisation(id) ON DELETE CASCADE,
	name text,
	map_type text,			-- mapbox || geojson
	description text,
	config text,
	version integer
	);
ALTER TABLE map OWNER TO ws;

-- Upgrade to: 15.12 from 15.11
alter table organisation add column website text;
alter table users add column password_reset boolean default false;

------ Performance Patches (For subscriber)
CREATE index o_l_id ON option(l_id);
CREATE index q_f_id ON question(f_id);

-- Upgrade to: 16.01 from 15.12
update form set repeats = subquery.calculate from (select f_id, calculate, path from question) as subquery
	where subquery.f_id = form.parentform and subquery.path = form.path || '_count';
delete from question q where q.calculate is not null and q.path in 
	(select f.path || '_count' from form f where  q.f_id = f.parentform);
	
-- Convert schedule_at to timestamp
alter table tasks add column schedule_atx timestamp with time zone;
update tasks set schedule_atx = schedule_at;
alter table tasks drop column schedule_at;
alter table tasks rename column schedule_atx to schedule_at;

CREATE SEQUENCE location_seq START 1;
ALTER SEQUENCE location_seq OWNER TO ws;	

-- uploading of locations
CREATE SEQUENCE location_seq START 1;
ALTER SEQUENCE location_seq OWNER TO ws;	

CREATE TABLE public.locations (
	id integer DEFAULT nextval('location_seq') NOT NULL PRIMARY KEY,
	o_id integer REFERENCES organisation ON DELETE CASCADE,
	locn_group text,
	locn_type text,
	name text,
	uid text
);
ALTER TABLE public.locations OWNER TO ws;

-- The following is deprecated but some code still refers to the column
alter table question add column repeatcount boolean default false;

-- Upgrade to: 16.02 from 16.01
alter table tasks add column location_trigger text;
alter table server add column version text;

-- Upgrade to: 16.03 from 16.02
alter table task_group add column rule text;
alter table task_group add column source_s_id integer;
alter table upload_event add column survey_notes text;
alter table upload_event add column location_trigger text;

-- Upgrade to 16.04 from 16.03
alter table project add column tasks_only boolean;
alter table server add column mapbox_default text;
alter table question add column required_msg text;
alter table question add column autoplay text;
alter table organisation add column locale text;

-- Add data processing table
alter table survey add column managed_id integer;

CREATE SEQUENCE dp_seq START 1;
ALTER SEQUENCE dp_seq OWNER TO ws;

create TABLE data_processing (
	id INTEGER DEFAULT NEXTVAL('dp_seq') CONSTRAINT pk_dp PRIMARY KEY,
	o_id INTEGER REFERENCES organisation(id) ON DELETE CASCADE,
	name text,
	type text,			-- lqas || manage
	description text,
	config text
	);
ALTER TABLE data_processing OWNER TO ws;

insert into groups(id,name) values(5,'manage');

-- Tasks
alter table tasks add column schedule_finish timestamp with time zone;
alter table tasks add column email text;
alter table tasks add column guidance text;
alter table users add column current_task_group_id integer;

-- Upgrade to 16.05 from 16.04
alter table survey add column loaded_from_xls boolean;
update survey set loaded_from_xls = 'true' where loaded_from_xls is null;
alter table survey alter column loaded_from_xls set default false;

CREATE SEQUENCE set_seq START 1;
ALTER SEQUENCE set_seq OWNER TO ws;

CREATE TABLE general_settings (
	id INTEGER DEFAULT NEXTVAL('set_seq') CONSTRAINT pk_settings PRIMARY KEY,
	u_id integer REFERENCES users(id) ON DELETE CASCADE,
	s_id integer REFERENCES survey(s_id) ON DELETE CASCADE,
	key text,
	settings text		-- JSON

	);
ALTER TABLE general_settings OWNER TO ws;

alter table tasks alter column schedule_finish type timestamp;
alter table tasks alter column schedule_at type timestamp;
alter table tasks add column repeat_count integer default 0;

-- Upgrade to 16.06 from 16.05
alter table survey add column hrk text;
--alter table question add column linked_survey int default 0;
alter table question add column list_name text;

-- Log table
CREATE SEQUENCE log_seq START 1;
ALTER SEQUENCE log_seq OWNER TO ws;

create TABLE log (
	id integer DEFAULT NEXTVAL('log_seq') CONSTRAINT pk_log PRIMARY KEY,
	log_time TIMESTAMP WITH TIME ZONE,
	s_id integer,
	o_id integer,
	user_ident text,
	event text,
	note text
	);
ALTER TABLE log OWNER TO ws;

-- Information on survey creation
alter table survey add column based_on text;
alter table survey add column shared_table boolean default false;
alter table survey add column created timestamp with time zone;

alter table server add column google_key text;

-- Upgrade to 16.07 from 16.06

insert into groups(id,name) values(6,'security');
insert into user_group (u_id, g_id) select u_id, 6 from user_group where g_id = 4;


CREATE SEQUENCE custom_report_seq START 2;
ALTER SEQUENCE custom_report_seq OWNER TO ws;

CREATE TABLE custom_report (
	id integer DEFAULT NEXTVAL('custom_report_seq') CONSTRAINT pk_custom_report PRIMARY KEY,
	o_id integer REFERENCES organisation(id) ON DELETE CASCADE,
	name text,
	type text,								-- oversight || lqas
	config text								-- custom report configuration as json object
	);
ALTER TABLE custom_report OWNER TO ws;
CREATE UNIQUE INDEX custom_report_name ON custom_report(o_id, name);

-- Linked forms
CREATE SEQUENCE linked_forms_seq START 1;
ALTER TABLE linked_forms_seq OWNER TO ws;

CREATE TABLE public.linked_forms (
	id integer DEFAULT nextval('linked_forms_seq') NOT NULL PRIMARY KEY,
	Linked_s_id integer,
	linked_table text,
	number_records integer,
	linker_s_id integer
);
ALTER TABLE public.linked_forms OWNER TO ws;

alter table question add column accuracy text;

-- Upgrade to 16.08 from 16.07
CREATE SEQUENCE role_seq START 1;
ALTER TABLE role_seq OWNER TO ws;

CREATE TABLE public.role (
	id integer DEFAULT nextval('role_seq') NOT NULL PRIMARY KEY,
	o_id integer REFERENCES organisation(id) ON DELETE CASCADE,
	name text,
	description text,
	changed_by text,
	changed_ts TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.role OWNER TO ws;
CREATE UNIQUE INDEX role_name_index ON public.role(o_id, name);

CREATE SEQUENCE user_role_seq START 1;
ALTER SEQUENCE user_role_seq OWNER TO ws;

create TABLE user_role (
	id INTEGER DEFAULT NEXTVAL('user_role_seq') CONSTRAINT pk_user_role PRIMARY KEY,
	u_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
	r_id INTEGER REFERENCES role(id) ON DELETE CASCADE
	);
ALTER TABLE user_role OWNER TO ws;

CREATE SEQUENCE survey_role_seq START 1;
ALTER SEQUENCE survey_role_seq OWNER TO ws;

create TABLE survey_role (
	id integer DEFAULT NEXTVAL('survey_role_seq') CONSTRAINT pk_survey_role PRIMARY KEY,
	s_id integer REFERENCES survey(s_id) ON DELETE CASCADE,
	r_id integer REFERENCES role(id) ON DELETE CASCADE,
	enabled boolean,
	column_filter text,
	row_filter text
	);
ALTER TABLE survey_role OWNER TO ws;
CREATE UNIQUE INDEX survey_role_index ON public.survey_role(s_id, r_id);

alter table users add column temporary boolean default false;
update users set temporary = false where temporary is null;
alter table organisation add column timezone text;

-- Upgrade to 16.09 from 16.08

-- Create alert table
CREATE SEQUENCE alert_seq START 1;
ALTER SEQUENCE alert_seq OWNER TO ws;

create TABLE alert (
	id integer DEFAULT NEXTVAL('alert_seq') CONSTRAINT pk_alert PRIMARY KEY,
	u_id integer REFERENCES users(id) ON DELETE CASCADE,
	status varchar(10),
	priority integer,
	updated_time TIMESTAMP WITH TIME ZONE,
	created_time TIMESTAMP WITH TIME ZONE,
	link text,
	message text,
	s_id integer,	-- Survey Id that the alert applies to
	m_id integer,	-- Managed form id that the alert applies to
	prikey integer	-- Primary key of survey for which the alert applies
);
ALTER TABLE alert OWNER TO ws;

-- Add action details for temporary user
alter table users add column action_details text;	-- Only used by temporary users
alter table users add column lastalert text;		-- Normal users
alter table users add column seen boolean;			-- Normal users

-- Delete entries from dashboard settings when the user is deleted
delete from dashboard_settings where ds_user_ident not in (select ident from users);
alter table dashboard_settings add constraint ds_user_ident FOREIGN KEY (ds_user_ident)
	REFERENCES users (ident) MATCH SIMPLE
	ON UPDATE NO ACTION ON DELETE CASCADE;
	
-- Upgrade to 16.12
-- The following may be required on some servers
-- alter table survey_change drop constraint survey_change_s_id_fkey;
-- alter table survey_change add constraint survey_change_survey FOREIGN KEY (s_id)
-- REFERENCES survey (s_id) MATCH SIMPLE
-- ON UPDATE NO ACTION ON DELETE CASCADE;

-- Add configuration options for fieldTask
alter table organisation add column ft_odk_style_menus boolean default true;
alter table organisation add column ft_review_final boolean default true;

-- Upgrade to 17.01
alter table survey add column pulldata text;
alter table linked_forms add column link_file text;
delete from linked_forms where linked_s_id not in (select s_id from survey);
alter table linked_forms add constraint lf_survey1 FOREIGN KEY (linked_s_id)
	REFERENCES survey (s_id) MATCH SIMPLE
	ON UPDATE NO ACTION ON DELETE CASCADE;
delete from linked_forms where linker_s_id not in (select s_id from survey);
alter table linked_forms add constraint lf_survey2 FOREIGN KEY (linker_s_id)
	REFERENCES survey (s_id) MATCH SIMPLE
	ON UPDATE NO ACTION ON DELETE CASCADE;
	
-- Upgrade to 17.02
alter table survey add column timing_data boolean;
alter table question add column linked_target text;
update question set linked_target = cast(linked_survey as text) where linked_survey > 0 and linked_target is null ;

CREATE SEQUENCE custom_query_seq START 1;
ALTER SEQUENCE custom_query_seq OWNER TO ws;

create TABLE custom_query (
	id integer DEFAULT NEXTVAL('custom_query_seq') CONSTRAINT pk_custom_query PRIMARY KEY,
	u_id integer REFERENCES users(id) ON DELETE CASCADE,
	name text,
	query text
	
);
ALTER TABLE custom_query OWNER TO ws;

-- Create view tables
CREATE SEQUENCE user_view_seq START 1;
ALTER SEQUENCE user_view_seq OWNER TO ws;

create TABLE user_view (
	id INTEGER DEFAULT NEXTVAL('user_view_seq') CONSTRAINT pk_user_view PRIMARY KEY,
	u_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
	v_id INTEGER REFERENCES survey_view(id) ON DELETE CASCADE,
	access text		-- read || write || owner
	);
ALTER TABLE user_view OWNER TO ws;

DROP SEQUENCE IF EXISTS survey_view_seq CASCADE;
CREATE SEQUENCE survey_view_seq START 1;
ALTER SEQUENCE survey_view_seq OWNER TO ws;

create TABLE survey_view (
	id integer DEFAULT NEXTVAL('survey_view_seq') CONSTRAINT pk_survey_view PRIMARY KEY,
	s_id integer,		-- optional survey id
	m_id integer,		-- optional managed id requires s_id to be set
	query_id integer,	-- optional query id
	view text
);
ALTER TABLE survey_view OWNER TO ws;

CREATE SEQUENCE default_user_view_seq START 1;
ALTER SEQUENCE default_user_view_seq OWNER TO ws;

create TABLE default_user_view (
	id INTEGER DEFAULT NEXTVAL('default_user_view_seq') CONSTRAINT pk_default_user_view PRIMARY KEY,
	u_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
	s_id integer,		-- survey id
	m_id integer,		-- managed id requires s_id to be set
	query_id integer,	-- query id
	v_id integer REFERENCES survey_view(id) ON DELETE CASCADE		-- view id
	);
ALTER TABLE default_user_view OWNER TO ws;

-- Upgrade to 1703
alter TABLE survey_view add column map_view text;
alter TABLE survey_view add column chart_view text;


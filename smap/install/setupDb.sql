CREATE USER ws WITH PASSWORD 'ws1234';

DROP SEQUENCE IF EXISTS sc_seq CASCADE;
CREATE SEQUENCE sc_seq START 1;
ALTER SEQUENCE sc_seq OWNER TO ws;

DROP SEQUENCE IF EXISTS s_seq CASCADE;
CREATE SEQUENCE s_seq START 1;
ALTER SEQUENCE s_seq OWNER TO ws;
 
DROP SEQUENCE IF EXISTS f_seq CASCADE;
CREATE SEQUENCE f_seq START 1;
ALTER SEQUENCE f_seq OWNER TO ws;

DROP SEQUENCE IF EXISTS o_seq CASCADE;
CREATE SEQUENCE o_seq START 1;
ALTER SEQUENCE o_seq OWNER TO ws;	

DROP SEQUENCE IF EXISTS l_seq CASCADE;
CREATE SEQUENCE l_seq START 1;
ALTER SEQUENCE l_seq OWNER TO ws;		

DROP SEQUENCE IF EXISTS q_seq CASCADE;
CREATE SEQUENCE q_seq START 1;
ALTER SEQUENCE q_seq OWNER TO ws;	

DROP SEQUENCE IF EXISTS ssc_seq CASCADE;
CREATE SEQUENCE ssc_seq START 1;
ALTER SEQUENCE ssc_seq OWNER TO ws;

DROP SEQUENCE IF EXISTS forward_seq CASCADE;
CREATE SEQUENCE forward_seq START 1;
ALTER SEQUENCE forward_seq OWNER TO ws;

DROP SEQUENCE IF EXISTS notification_log_seq CASCADE;
CREATE SEQUENCE notification_log_seq START 1;
ALTER SEQUENCE notification_log_seq OWNER TO ws;

DROP SEQUENCE IF EXISTS t_seq CASCADE;
CREATE SEQUENCE t_seq START 1;
ALTER SEQUENCE t_seq OWNER TO ws;	

DROP SEQUENCE IF EXISTS location_seq CASCADE;
CREATE SEQUENCE location_seq START 1;
ALTER SEQUENCE location_seq OWNER TO ws;	

DROP SEQUENCE IF EXISTS l_seq CASCADE;
CREATE SEQUENCE l_seq START 1;
ALTER SEQUENCE l_seq OWNER TO ws;	

DROP SEQUENCE IF EXISTS g_seq CASCADE;
CREATE SEQUENCE g_seq START 1;
ALTER SEQUENCE g_seq OWNER TO ws;

DROP SEQUENCE IF EXISTS ue_seq CASCADE;
CREATE SEQUENCE ue_seq START 1;
ALTER SEQUENCE ue_seq OWNER TO ws;

DROP SEQUENCE IF EXISTS se_seq CASCADE;
CREATE SEQUENCE se_seq START 1;
ALTER SEQUENCE se_seq OWNER TO ws;

DROP SEQUENCE IF EXISTS dp_seq CASCADE;
CREATE SEQUENCE dp_seq START 1;
ALTER SEQUENCE dp_seq OWNER TO ws;

DROP SEQUENCE IF EXISTS sc_seq CASCADE;
CREATE SEQUENCE sc_seq START 1;
ALTER SEQUENCE sc_seq OWNER TO ws;

DROP SEQUENCE IF EXISTS custom_report_seq CASCADE;
CREATE SEQUENCE custom_report_seq START 2;
ALTER SEQUENCE custom_report_seq OWNER TO ws;

-- User management
DROP SEQUENCE IF EXISTS project_seq CASCADE;
CREATE SEQUENCE project_seq START 10;
ALTER SEQUENCE project_seq OWNER TO ws;

DROP SEQUENCE IF EXISTS regions_seq CASCADE;
CREATE SEQUENCE regions_seq START 10;
ALTER SEQUENCE regions_seq OWNER TO ws;

-- Server level defaults
DROP TABLE IF EXISTS server CASCADE;
create TABLE server (
	smtp_host text,
	email_domain text,
	email_user text,
	email_password text,
	email_port integer,
	version text,
	mapbox_default text,
	google_key text
	);
ALTER TABLE server OWNER TO ws;

DROP SEQUENCE IF EXISTS organisation_seq CASCADE;
CREATE SEQUENCE organisation_seq START 10;
ALTER SEQUENCE organisation_seq OWNER TO ws;

DROP TABLE IF EXISTS organisation CASCADE;
create TABLE organisation (
	id INTEGER DEFAULT NEXTVAL('organisation_seq') CONSTRAINT pk_organisation PRIMARY KEY,
	name text,
	company_name text,
	company_address text,
	company_phone text,
	company_email text,
	allow_email boolean,
	allow_facebook boolean,
	allow_twitter boolean,
	can_edit boolean,
	ft_delete_submitted boolean,
	ft_send_trail boolean,
	ft_sync_incomplete boolean,
	ft_odk_style_menus boolean default true,
	ft_review_final boolean default true,
	changed_by text,
	admin_email text,
	smtp_host text,				-- Set if email is enabled
	email_domain text,
	email_user text,
	email_password text,
	email_port integer,
	default_email_content text,
	website text,
	locale text,				-- default locale for the organisation
	timezone text,				-- default timezone for the organisation
	changed_ts TIMESTAMP WITH TIME ZONE
	);
CREATE UNIQUE INDEX idx_organisation ON organisation(name);
ALTER TABLE organisation OWNER TO ws;

DROP SEQUENCE IF EXISTS log_seq CASCADE;
CREATE SEQUENCE log_seq START 1;
ALTER SEQUENCE log_seq OWNER TO ws;

-- Log table
DROP TABLE IF EXISTS log CASCADE;
create TABLE log (
	id integer DEFAULT NEXTVAL('log_seq') CONSTRAINT pk_log PRIMARY KEY,
	log_time TIMESTAMP WITH TIME ZONE,
	s_id integer,
	o_id integer REFERENCES organisation(id) ON DELETE CASCADE,
	user_ident text,
	event text,	
	note text
	);
ALTER TABLE log OWNER TO ws;

DROP TABLE IF EXISTS project CASCADE;
create TABLE project (
	id INTEGER DEFAULT NEXTVAL('project_seq') CONSTRAINT pk_project PRIMARY KEY,
	o_id INTEGER REFERENCES organisation(id) ON DELETE CASCADE,
	name text,
	description text,
	tasks_only boolean default false,	-- When true only tasks will be downloaded to fieldTask
	changed_by text,
	changed_ts TIMESTAMP WITH TIME ZONE
	);
CREATE UNIQUE INDEX idx_project ON project(o_id,name);
ALTER TABLE project OWNER TO ws;


DROP TABLE IF EXISTS regions CASCADE;
create TABLE regions (
	id INTEGER DEFAULT NEXTVAL('regions_seq') CONSTRAINT pk_regions PRIMARY KEY,
	o_id INTEGER REFERENCES organisation(id) ON DELETE CASCADE,
	table_name text,
	region_name text,
	geometry_column text
	);
ALTER TABLE regions OWNER TO ws;

DROP SEQUENCE IF EXISTS map_seq CASCADE;
CREATE SEQUENCE map_seq START 1;
ALTER SEQUENCE map_seq OWNER TO ws;

DROP TABLE IF EXISTS map CASCADE;
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

DROP TABLE IF EXISTS data_processing CASCADE;
create TABLE data_processing (
	id INTEGER DEFAULT NEXTVAL('dp_seq') CONSTRAINT pk_dp PRIMARY KEY,
	o_id INTEGER REFERENCES organisation(id) ON DELETE CASCADE,
	name text,
	type text,			-- lqas || manage
	description text,
	config text
	);
ALTER TABLE data_processing OWNER TO ws;

DROP SEQUENCE IF EXISTS users_seq CASCADE;
CREATE SEQUENCE users_seq START 2;
ALTER SEQUENCE users_seq OWNER TO ws;

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
	id INTEGER DEFAULT NEXTVAL('users_seq') CONSTRAINT pk_users PRIMARY KEY,
	ident text,
	temporary boolean default false,			-- If true will not show in user management page
	password text,
	realm text,
	name text,
	settings text,				-- User configurable settings
	signature text,
	language varchar(10),
	location text,
	has_gps boolean,
	has_camera boolean,
	has_barcode boolean,
	has_data boolean,
	has_sms boolean,
	phone_number text,
	email text,
	device_id text,
	max_dist_km integer,
	user_role text,
	current_project_id integer,		-- Set to the last project the user selected
	current_survey_id integer,		-- Set to the last survey the user selected
	current_task_group_id integer,	-- Set to the last task group the user selected
	one_time_password varchar(36),	-- For password reset
	one_time_password_expiry timestamp with time zone,		-- Time and date one time password expires
	password_reset boolean default false,	-- Set true if the user has reset their password
	o_id integer REFERENCES organisation(id) ON DELETE CASCADE,
	action_details text,			-- Details of a specific action the user can undertake
	lastalert text,					-- Time last alert sent to the user
	seen boolean					-- True if the user has aknowledged the alert
	);
CREATE UNIQUE INDEX idx_users_ident ON users(ident);
ALTER TABLE users OWNER TO ws;

DROP SEQUENCE IF EXISTS dynamic_users_seq CASCADE;
CREATE SEQUENCE dynamic_users_seq START 1;
ALTER SEQUENCE dynamic_users_seq OWNER TO ws;

DROP TABLE IF EXISTS dynamic_users CASCADE;
CREATE TABLE dynamic_users (
	id INTEGER DEFAULT NEXTVAL('dynamic_users_seq') CONSTRAINT pk_dynamic_users PRIMARY KEY,
	u_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
	survey_ident text,
	access_key varchar(41),
	expiry timestamp with time zone
	);
ALTER TABLE dynamic_users OWNER TO ws;

DROP TABLE IF EXISTS groups CASCADE;
create TABLE groups (
	id INTEGER CONSTRAINT pk_groups PRIMARY KEY,
	name text
	);
CREATE UNIQUE INDEX idx_groups_name ON groups(name);
ALTER TABLE groups OWNER TO ws;
	
DROP SEQUENCE IF EXISTS user_group_seq CASCADE;
CREATE SEQUENCE user_group_seq START 1;
ALTER SEQUENCE user_group_seq OWNER TO ws;

DROP TABLE IF EXISTS user_group CASCADE;
create TABLE user_group (
	id INTEGER DEFAULT NEXTVAL('user_group_seq') CONSTRAINT pk_user_group PRIMARY KEY,
	u_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
	g_id INTEGER REFERENCES groups(id) ON DELETE CASCADE
	);
ALTER TABLE user_group OWNER TO ws;
	
DROP SEQUENCE IF EXISTS user_project_seq CASCADE;
CREATE SEQUENCE user_project_seq START 1;
ALTER SEQUENCE user_project_seq OWNER TO ws;

DROP TABLE IF EXISTS user_project CASCADE;
create TABLE user_project (
	id INTEGER DEFAULT NEXTVAL('user_project_seq') CONSTRAINT pk_user_project PRIMARY KEY,
	u_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
	p_id INTEGER REFERENCES project(id) ON DELETE CASCADE
	);
ALTER TABLE user_project OWNER TO ws;


DROP SEQUENCE IF EXISTS role_seq CASCADE;
CREATE SEQUENCE role_seq START 1;
ALTER TABLE role_seq OWNER TO ws;

DROP TABLE IF EXISTS public.role CASCADE;
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

DROP SEQUENCE IF EXISTS user_role_seq CASCADE;
CREATE SEQUENCE user_role_seq START 1;
ALTER SEQUENCE user_role_seq OWNER TO ws;

DROP TABLE IF EXISTS user_role CASCADE;
create TABLE user_role (
	id INTEGER DEFAULT NEXTVAL('user_role_seq') CONSTRAINT pk_user_role PRIMARY KEY,
	u_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
	r_id INTEGER REFERENCES role(id) ON DELETE CASCADE
	);
ALTER TABLE user_role OWNER TO ws;

-- Create an administrator and set up defaul values
insert into organisation(id, name, allow_email, allow_facebook, allow_twitter) values(1, 'Smap', 'true', 'true', 'true');

insert into users (id, ident, realm, password, o_id, name, email) 
	values (1, 'admin', 'smap', '9f12895fe9898cc306c45c9d3fcbc3d6', 1, 'Administrator', '');

insert into groups(id,name) values(1,'admin');
insert into groups(id,name) values(2,'analyst');
insert into groups(id,name) values(3,'enum');
insert into groups(id,name) values(4,'org admin');
insert into groups(id,name) values(5,'manage');
insert into groups(id,name) values(6,'security');

insert into user_group (u_id, g_id) values (1, 1);
insert into user_group (u_id, g_id) values (1, 2);
insert into user_group (u_id, g_id) values (1, 3);
insert into user_group (u_id, g_id) values (1, 4);
insert into user_group (u_id, g_id) values (1, 5);
insert into user_group (u_id, g_id) values (1, 6);

insert into project (id, o_id, name) values (1, 1, 'A project');

insert into user_project (u_id, p_id) values (1 , 1);

-- Monitoring tables
DROP TABLE IF EXISTS upload_event CASCADE;
CREATE TABLE upload_event (
	ue_id INTEGER DEFAULT NEXTVAL('ue_seq') CONSTRAINT pk_upload_event PRIMARY KEY,
	s_id INTEGER,
	ident text,	-- Identifier used by survey
	p_id INTEGER,
	upload_time TIMESTAMP WITH TIME ZONE,
	user_name text,
	file_name text,
	file_path text,
	survey_name text,
	imei text,
	orig_survey_ident text,
	update_id varchar(41),
	assignment_id INTEGER,
	instanceid varchar(41),
	status varchar(10),
	reason text,
	location text,
	form_status text,
	notifications_applied boolean,		-- Set after notifications are sent
	incomplete boolean default false,	-- odk will set this if sending attachments in multiple posts
	server_name text,  -- Stores the server used to upload the results.  The url's of all attachments will reference this address
	survey_notes text,		-- Notes added during completion of the task
	location_trigger text	-- The trigger for the completion of the task
	);

ALTER TABLE upload_event OWNER TO ws;

DROP TABLE IF EXISTS subscriber_event CASCADE;
CREATE TABLE subscriber_event (
	se_id INTEGER DEFAULT NEXTVAL('se_seq') CONSTRAINT pk_subscriber_event PRIMARY KEY,
	ue_id INTEGER REFERENCES upload_event ON DELETE CASCADE,
	subscriber text,
	dest text,
	status varchar(10),
	reason text
	);
CREATE INDEX se_ue_id_sequence ON subscriber_event(ue_id);

ALTER TABLE subscriber_event OWNER TO ws;

DROP TABLE IF EXISTS option CASCADE;
DROP TABLE IF EXISTS question CASCADE;
DROP TABLE IF EXISTS ssc CASCADE;
DROP TABLE IF EXISTS form CASCADE;
DROP TABLE IF EXISTS survey CASCADE;
DROP TABLE IF EXISTS survey_change CASCADE;

DROP TABLE IF EXISTS survey CASCADE;
CREATE TABLE survey (
	s_id INTEGER DEFAULT NEXTVAL('s_seq') CONSTRAINT pk_survey PRIMARY KEY,
	name text,
	ident text,										-- identifier used by survey clients
	version integer,								-- Version of the survey
	p_id INTEGER REFERENCES project(id),			-- Project id
	blocked boolean default false,					-- Blocked indicator, no uploads accepted if true
	deleted boolean default false,					-- Soft delete indicator
	display_name text not null,
	def_lang text,
	task_file boolean,								-- allow loading of tasks from a file
	timing_data boolean,							-- collect timing data on the phone
	class text,
	model text,										-- JSON model of the survey for thingsat
	manifest text,									-- JSON set of manifest information for the survey
	instance_name text,								-- The rule for naming a survey instance form its data
	last_updated_time DATE,
	managed_id integer,								-- Identifier of configuration for managing records
	loaded_from_xls boolean default false,			-- Set true if the survey was initially loaded from an XLS Form
	hrk text,										-- human readable key
	based_on text,									-- Survey and form this survey was based on
	shared_table boolean default false,				-- True if this survey shares its table
	pulldata text,									-- Settings to customise pulling data from another survey into a csv file
	created timestamp with time zone				-- Date / Time the survey was created
	);
ALTER TABLE survey OWNER TO ws;
DROP INDEX IF EXISTS SurveyDisplayName;
CREATE UNIQUE INDEX SurveyDisplayName ON survey(p_id, display_name);
DROP INDEX IF EXISTS SurveyKey;
CREATE UNIQUE INDEX SurveyKey ON survey(ident);

DROP TABLE IF EXISTS survey_change CASCADE;
CREATE TABLE survey_change (
	c_id integer DEFAULT NEXTVAL('sc_seq') CONSTRAINT pk_survey_changes PRIMARY KEY,
	s_id integer REFERENCES survey ON DELETE CASCADE,	-- Survey containing this version		
	version integer,							-- Version of survey with these changes
	changes text,								-- Changes as json object
	apply_results boolean default false,		-- Set to true if the results tables need to be updated	
	success boolean default false,				-- Set true of the update was a success
	msg text,									-- Error messages
	user_id integer,							-- Person who made the changes
	updated_time TIMESTAMP WITH TIME ZONE		-- Time and date of change
	);
ALTER TABLE survey_change OWNER TO ws;

DROP TABLE IF EXISTS custom_report CASCADE;
CREATE TABLE custom_report (
	id integer DEFAULT NEXTVAL('custom_report_seq') CONSTRAINT pk_custom_report PRIMARY KEY,
	o_id integer REFERENCES organisation(id) ON DELETE CASCADE,
	name text,
	type text,								-- oversight || lqas
	config text								-- Custom report configuration as json object
	);
ALTER TABLE custom_report OWNER TO ws;
CREATE UNIQUE INDEX custom_report_name ON custom_report(o_id, name);

-- table name is used by "results databases" to store result data for this form
DROP TABLE IF EXISTS form CASCADE;
CREATE TABLE form (
	f_id INTEGER DEFAULT NEXTVAL('f_seq') CONSTRAINT pk_form PRIMARY KEY,
	s_id INTEGER REFERENCES survey ON DELETE CASCADE,
	name text,
	label text,
	table_name text,
	parentForm integer not null default 0,
	parentQuestion integer not null default 0,
	repeats text,
	path text,
	form_index int default -1					-- Temporary data used by the online editor
	);
ALTER TABLE form OWNER TO ws;

DROP TABLE IF EXISTS listname CASCADE;
CREATE TABLE listname (
	l_id INTEGER DEFAULT NEXTVAL('l_seq') CONSTRAINT pk_listname PRIMARY KEY,
	s_id integer references survey on delete cascade, 
	name text
	);
ALTER TABLE listname OWNER TO ws;
CREATE UNIQUE INDEX listname_name ON listname(s_id, name);

-- q_itext references the text string in the translations table
DROP TABLE IF EXISTS question CASCADE;
CREATE TABLE question (
	q_id INTEGER DEFAULT NEXTVAL('q_seq') CONSTRAINT pk_question PRIMARY KEY,
	f_id INTEGER REFERENCES form ON DELETE CASCADE,
	l_id integer default 0,
	seq INTEGER,
	qName text NOT NULL,
	column_name text,							-- Name of column in results table
	column_name_applied boolean default false,	-- If set true column name has been added to results
	qType text,
	question text,
	qtext_id text,
	defaultAnswer text,
	info text,
	infotext_id text,
	visible BOOLEAN default true,
	source text,
	source_param text,
	readonly BOOLEAN default false,
	mandatory BOOLEAN default false,
	relevant text,
	calculate text,
	qConstraint text,
	constraint_msg text,
	required_msg text,
	appearance text,
	enabled BOOLEAN default true,
	path text,
	nodeset text,						-- the xpath to an itemset containing choices, includes filter defn
	nodeset_value text,					-- name of value column for choice list when stored as an itemset
	nodeset_label text,					-- name of label column for choice list when stored as an itemset
	cascade_instance text,				-- Identical to list name (deprecate)
	list_name text,						-- Name of a set of options common across multiple questions
	published boolean default false,		-- Set true when a survey has been published for data collection
										--  Once a survey has been published there are constraints on the
										--  changes that can be applied to question definitions
	soft_deleted boolean default false,	-- Set true if a question has been deleted and has also been published
										-- If the question hasn't been published then it can be removed from the survey
	autoplay text,
	accuracy text,						-- gps accuracy at which a reading is automatically accepted
	linked_target text;					-- Id of a survey whose hrk is populated here
	);
ALTER TABLE question OWNER TO ws;
CREATE INDEX qtext_id_sequence ON question(qtext_id);
CREATE INDEX infotext_id_sequence ON question(infotext_id);
CREATE UNIQUE INDEX qname_index ON question(f_id,qname) where soft_deleted = 'false';
CREATE INDEX q_f_id ON question(f_id);
	
DROP TABLE IF EXISTS option CASCADE;
CREATE TABLE option (
	o_id INTEGER DEFAULT NEXTVAL('o_seq') CONSTRAINT pk_option PRIMARY KEY,
	q_id integer,
	l_id integer references listname on delete cascade,
	seq INTEGER,
	label text,
	label_id text,
	oValue text,
	column_name text,
	selected BOOLEAN,
	cascade_filters text,
	published boolean default false,
	externalfile boolean default false
	);
ALTER TABLE option OWNER TO ws;
CREATE INDEX label_id_sequence ON option(label_id);
CREATE index o_l_id ON option(l_id);

-- Server side calculates
DROP TABLE IF EXISTS ssc;
CREATE TABLE ssc (
	id INTEGER DEFAULT NEXTVAL('ssc_seq') CONSTRAINT pk_ssc PRIMARY KEY,
	s_id INTEGER REFERENCES survey ON DELETE CASCADE,
	f_id INTEGER,
	name text,
	type text,
	units varchar(20),
	function text,
	parameters text
	);
ALTER TABLE ssc OWNER TO ws;
CREATE UNIQUE INDEX SscName ON ssc(s_id, name);

-- Survey Forwarding (All notifications are stored in here, forward is a legacy name)
DROP TABLE IF EXISTS forward;
CREATE TABLE forward (
	id INTEGER DEFAULT NEXTVAL('forward_seq') CONSTRAINT pk_forward PRIMARY KEY,
	s_id INTEGER REFERENCES survey ON DELETE CASCADE,
	enabled boolean,
	target text,
	remote_s_id text,
	remote_s_name text,
	remote_user text,
	remote_password text,
	remote_host text,
	notify_details	text				-- JSON string
	);
ALTER TABLE forward OWNER TO ws;
CREATE UNIQUE INDEX ForwardDest ON forward(s_id, remote_s_id, remote_host);

-- Log of all sent notifications (except for forwards which are recorded by the forward subscriber)
DROP TABLE IF EXISTS notification_log;
CREATE TABLE public.notification_log (
	id integer default nextval('notification_log_seq') not null PRIMARY KEY,
	o_id integer,
	p_id integer,
	s_id integer,
	notify_details text,
	status text,	
	status_details text,
	event_time TIMESTAMP WITH TIME ZONE
	);
ALTER TABLE notification_log OWNER TO ws;


-- form can be long, short, image, audio, video
DROP TABLE IF EXISTS translation;
CREATE TABLE translation (
	t_id INTEGER DEFAULT NEXTVAL('t_seq') CONSTRAINT pk_translation PRIMARY KEY,
	s_id INTEGER REFERENCES survey ON DELETE CASCADE,
	language text,
	text_id text,
	type char(5),
	value text
	);
ALTER TABLE translation OWNER TO ws;
CREATE UNIQUE INDEX translation_index ON translation(s_id, language, text_id, type);
CREATE INDEX text_id_sequence ON translation(text_id);
CREATE INDEX language_sequence ON translation(language);
CREATE INDEX t_s_id_sequence ON translation(s_id);


DROP TABLE IF EXISTS language;
CREATE TABLE language (
	id INTEGER DEFAULT NEXTVAL('l_seq') CONSTRAINT pk_language PRIMARY KEY,
	s_id INTEGER REFERENCES survey ON DELETE CASCADE,
	seq int,
	language text	
	);
ALTER TABLE language OWNER TO ws;

-- Tables to manage settings

DROP SEQUENCE IF EXISTS ds_seq CASCADE;
CREATE SEQUENCE ds_seq START 1;
ALTER SEQUENCE ds_seq OWNER TO ws;

DROP TABLE IF EXISTS dashboard_settings CASCADE;
CREATE TABLE dashboard_settings (
	ds_id INTEGER DEFAULT NEXTVAL('ds_seq') CONSTRAINT pk_dashboard_settings PRIMARY KEY,
	ds_user_ident text,
	ds_seq INTEGER,
	ds_state text,
	ds_title text,
	ds_s_name text,
	ds_s_id integer,
	ds_type text,
	ds_region text,
	ds_lang text,
	ds_q_id INTEGER,
	ds_q_is_calc boolean default false,
	ds_date_question_id INTEGER,
	ds_question text,
	ds_fn text,
	ds_table text,
	ds_key_words text,
	ds_q1_function text,
	ds_group_question_id INTEGER,
	ds_group_question_text text,
	ds_group_type text,
	ds_layer_id integer,
	ds_time_group text,
	ds_from_date date,
	ds_to_date date,
	ds_filter text
	);
alter table dashboard_settings add constraint ds_user_ident FOREIGN KEY (ds_user_ident)
	REFERENCES users (ident) MATCH SIMPLE
	ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE dashboard_settings OWNER TO ws;


DROP SEQUENCE IF EXISTS set_seq CASCADE;
CREATE SEQUENCE set_seq START 1;
ALTER SEQUENCE set_seq OWNER TO ws;

DROP TABLE IF EXISTS general_settings CASCADE;
CREATE TABLE general_settings (
	id INTEGER DEFAULT NEXTVAL('set_seq') CONSTRAINT pk_settings PRIMARY KEY,
	u_id integer REFERENCES users(id) ON DELETE CASCADE,
	s_id integer REFERENCES survey(s_id) ON DELETE CASCADE,
	key text,			-- Identifies type of setting such as "mf" managed forms
	settings text		-- JSON

	);
ALTER TABLE general_settings OWNER TO ws;


--- Task Management -----------------------------------
-- Cleanup old tables  
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.task_group CASCADE;

DROP SEQUENCE IF EXISTS assignment_id_seq CASCADE;
CREATE SEQUENCE assignment_id_seq START 1;
ALTER TABLE assignment_id_seq OWNER TO ws;
  
DROP SEQUENCE IF EXISTS task_id_seq CASCADE;
CREATE SEQUENCE task_id_seq START 1;
ALTER TABLE task_id_seq OWNER TO ws;


DROP SEQUENCE IF EXISTS task_group_id_seq CASCADE;
CREATE SEQUENCE task_group_id_seq START 1;
ALTER TABLE task_group_id_seq OWNER TO ws;

CREATE TABLE public.task_group (
	tg_id integer NOT NULL DEFAULT nextval('task_group_id_seq') PRIMARY KEY,
	name text,
	p_id integer,
    address_params text,
    rule text,					-- The criteria for adding a new task to this group (JSON)
    source_s_id integer			-- The source survey id for quick lookup from notifications engine
);

ALTER TABLE public.task_group OWNER TO ws;

CREATE TABLE public.tasks (
	id integer DEFAULT nextval('task_id_seq') NOT NULL PRIMARY KEY,
	tg_id integer REFERENCES task_group ON DELETE CASCADE,
	type text,
	title text,
	url text,
	form_id integer REFERENCES survey(s_id) ON DELETE CASCADE,
	initial_data text,
	schedule_at timestamp,		-- no time zone, all values should be UTC
	schedule_finish timestamp,
    from_date date,
    address text,
	geo_type text,
	update_id text,
	repeat boolean,
	repeat_count integer default 0,
	email text,
	guidance text,
	p_id integer REFERENCES project(id),
	location_trigger text
);
SELECT AddGeometryColumn('tasks', 'geo_linestring', 4326, 'LINESTRING', 2);
SELECT AddGeometryColumn('tasks', 'geo_polygon', 4326, 'POLYGON', 2);
SELECT AddGeometryColumn('tasks', 'geo_point', 4326, 'POINT', 2);
ALTER TABLE public.tasks OWNER TO ws;

CREATE TABLE public.locations (
	id integer DEFAULT nextval('location_seq') NOT NULL PRIMARY KEY,
	o_id integer REFERENCES organisation ON DELETE CASCADE,
	locn_group text,
	locn_type text,
	name text,
	uid text
);
ALTER TABLE public.locations OWNER TO ws;

CREATE TABLE public.assignments (
	id integer NOT NULL DEFAULT nextval('assignment_id_seq'),
	assigned_by integer,
	assignee integer,
	status text NOT NULL,
	task_id integer,
	assigned_date date,
	last_status_changed_date date,
	PRIMARY KEY (id),
	CONSTRAINT assignee FOREIGN KEY (assignee)
      REFERENCES users (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE CASCADE,
  	CONSTRAINT assigner FOREIGN KEY (assigned_by)
      REFERENCES users (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT task_cons FOREIGN KEY (task_id)
      REFERENCES tasks (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE CASCADE
);
ALTER TABLE public.assignments OWNER TO ws;

-- Table to manage state of user downloads of forms
DROP SEQUENCE IF EXISTS form_downloads_id_seq CASCADE;
CREATE SEQUENCE form_downloads_id_seq START 1;
ALTER TABLE form_downloads_id_seq OWNER TO ws;

DROP TABLE IF EXISTS public.form_downloads CASCADE;
CREATE TABLE public.form_downloads (
	id integer DEFAULT nextval('form_downloads_id_seq') NOT NULL PRIMARY KEY,
	u_id integer REFERENCES users(id) ON DELETE CASCADE,
	form_ident text REFERENCES survey(ident) ON DELETE CASCADE,
	form_version text,
	device_id text,
	updated_time TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.form_downloads OWNER TO ws;

-- Tables to manage task completion and user location
DROP SEQUENCE IF EXISTS task_completion_id_seq CASCADE;
CREATE SEQUENCE task_completion_id_seq START 1;
ALTER TABLE task_completion_id_seq OWNER TO ws;

DROP TABLE IF EXISTS public.task_completion CASCADE;
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

DROP SEQUENCE IF EXISTS user_trail_id_seq CASCADE;
CREATE SEQUENCE user_trail_id_seq START 1;
ALTER TABLE user_trail_id_seq OWNER TO ws;

DROP TABLE IF EXISTS public.user_trail CASCADE;
CREATE TABLE public.user_trail (
	id integer DEFAULT nextval('user_trail_id_seq') NOT NULL PRIMARY KEY,
	u_id integer REFERENCES users(id) ON DELETE CASCADE,
	device_id text,
	event_time TIMESTAMP WITH TIME ZONE
);
SELECT AddGeometryColumn('user_trail', 'the_geom', 4326, 'POINT', 2);
ALTER TABLE public.user_trail OWNER TO ws;

DROP SEQUENCE IF EXISTS log_report_seq CASCADE;
CREATE SEQUENCE log_report_seq START 1;
ALTER TABLE log_report_seq OWNER TO ws;

DROP TABLE IF EXISTS public.log_report CASCADE;
CREATE TABLE public.log_report (
	id integer DEFAULT nextval('log_report_seq') NOT NULL PRIMARY KEY,
	u_id integer REFERENCES users(id) ON DELETE CASCADE,
	device_id text,
	report text,
	upload_time TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.log_report OWNER TO ws;

DROP SEQUENCE IF EXISTS linked_forms_seq CASCADE;
CREATE SEQUENCE linked_forms_seq START 1;
ALTER TABLE linked_forms_seq OWNER TO ws;

DROP TABLE IF EXISTS public.linked_forms CASCADE;
CREATE TABLE public.linked_forms (
	id integer DEFAULT nextval('linked_forms_seq') NOT NULL PRIMARY KEY,
	Linked_s_id integer REFERENCES survey(s_id) ON DELETE CASCADE,
	linked_table text,
	number_records integer,
	linker_s_id integer REFERENCES survey(s_id) ON DELETE CASCADE,
	link_file text
);
ALTER TABLE public.linked_forms OWNER TO ws;


DROP SEQUENCE IF EXISTS survey_role_seq CASCADE;
CREATE SEQUENCE survey_role_seq START 1;
ALTER SEQUENCE survey_role_seq OWNER TO ws;

DROP TABLE IF EXISTS survey_role CASCADE;
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

DROP SEQUENCE IF EXISTS alert_seq CASCADE;
CREATE SEQUENCE alert_seq START 1;
ALTER SEQUENCE alert_seq OWNER TO ws;

DROP TABLE IF EXISTS alert CASCADE;
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

DROP SEQUENCE IF EXISTS custom_query_seq CASCADE;
CREATE SEQUENCE custom_query_seq START 1;
ALTER SEQUENCE custom_query_seq OWNER TO ws;

DROP TABLE IF EXISTS custom_query CASCADE;
create TABLE custom_query (
	id integer DEFAULT NEXTVAL('custom_query_seq') CONSTRAINT pk_custom_query PRIMARY KEY,
	u_id integer REFERENCES users(id) ON DELETE CASCADE,
	name text,
	query text
	
);
ALTER TABLE custom_query OWNER TO ws;

DROP SEQUENCE IF EXISTS survey_view_seq CASCADE;
CREATE SEQUENCE survey_view_seq START 1;
ALTER SEQUENCE survey_view_seq OWNER TO ws;

DROP TABLE IF EXISTS survey_view CASCADE;
create TABLE survey_view (
	id integer DEFAULT NEXTVAL('survey_view_seq') CONSTRAINT pk_survey_view PRIMARY KEY,
	s_id integer,		-- optional survey id
	m_id integer,		-- optional managed id requires s_id to be set
	query_id integer,	-- optional query id
	view text,			-- Table view data
	map_view text,		-- Map view data
	chart_view text		-- Chart view data
	
);
ALTER TABLE survey_view OWNER TO ws;

DROP SEQUENCE IF EXISTS user_view_seq CASCADE;
CREATE SEQUENCE user_view_seq START 1;
ALTER SEQUENCE user_view_seq OWNER TO ws;

DROP TABLE IF EXISTS user_view CASCADE;
create TABLE user_view (
	id INTEGER DEFAULT NEXTVAL('user_view_seq') CONSTRAINT pk_user_view PRIMARY KEY,
	u_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
	v_id INTEGER REFERENCES survey_view(id) ON DELETE CASCADE,
	access TEXT		-- read || write || write
	);
ALTER TABLE user_view OWNER TO ws;

DROP SEQUENCE IF EXISTS default_user_view_seq CASCADE;
CREATE SEQUENCE default_user_view_seq START 1;
ALTER SEQUENCE default_user_view_seq OWNER TO ws;

DROP TABLE IF EXISTS default_user_view CASCADE;
create TABLE default_user_view (
	id INTEGER DEFAULT NEXTVAL('default_user_view_seq') CONSTRAINT pk_default_user_view PRIMARY KEY,
	u_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
	s_id integer,		-- survey id
	m_id integer,		-- managed id requires s_id to be set
	query_id integer,	-- query id
	v_id integer REFERENCES survey_view(id) ON DELETE CASCADE		-- view id
	);
ALTER TABLE default_user_view OWNER TO ws;

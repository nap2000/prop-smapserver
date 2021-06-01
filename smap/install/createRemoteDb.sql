-- Create users and databases in a remote database

create user ws;
alter user ws with password 'ws1234';

-- Quicksight users
create user quicksight;
create user quicksight_supply;
create user qsadmin;
create user rep_user;

grant ws to postgres;
grant quicksight_supply to postgres;
grant rep_user to postgres;
grant qsadmin to postgres;

create database survey_definitions with encoding=UTF8 owner=ws;
\c survey_definitions
CREATE EXTENSION postgis;
ALTER TABLE geometry_columns OWNER TO ws; ALTER TABLE spatial_ref_sys OWNER TO ws; ALTER TABLE geography_columns OWNER TO ws;

create database results with encoding=UTF8 owner=ws;
\c results
CREATE EXTENSION postgis;
ALTER TABLE geometry_columns OWNER TO ws; ALTER TABLE spatial_ref_sys OWNER TO ws; ALTER TABLE geography_columns OWNER TO ws;



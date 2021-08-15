========================= Activities

select prikey, _upload_time, _user, deviceid, ST_X(gps) as longitude, ST_Y(gps) as latitude, project, department, province, district, city, box, region, typeactivity, topic, name, manydays, official_address, starttime, endtime, date_activity, number, estimate, how_estimated from s97_main where not _bad

========================= Registration

-- Household

select prikey, _upload_time, _user, deviceid, ST_X(gps) as longitude, ST_Y(gps) as latitude, project, department, province, district, address_contact, housenumb, city, region_contact, hh_members, hh_women, hh_men from s73_main where not _bad

-- People

select s73_main.prikey, _upload_time, _user, deviceid, ST_X(gps) as longitude, ST_Y(gps) as latitude, project, department, province, district, address_contact, housenumb, city, region_contact, hh_members, hh_women, hh_men, document_type, document_type_other, id_number, person_key, firstname, lastname, middlename, relation_HH, date_birth, phone_number, email, sexe, marital, education_level, highest_grade, at_school, support, whosupport, school_attended, handicap, whathandicap, kids, working, income_source, income_source_other, employee, activity from s73_main, s73_person where s73_main.prikey = s73_person.parkey and not s73_main._bad;


-- Schools

select s77_main.prikey, _upload_time, _user, deviceid, ST_X(gps) as longitude, ST_Y(gps) as latitude, project, department, province, district, school_name, official_address, city_5, box, region, school_phone_number, school_email, school_facebook, school_twitter, school_website, school_fax, date_of_creation, legal_registration, contact_name, phone_number_contact, email_contact, address_contact, city as city_contact, region_contact, numb_members, attendee_id, a_first_name, a_last_name, a_name, role_ins, title, teach, teachgrade, teachsubjet, signature from s77_main, s77_staff where s77_main.prikey = s77_staff.parkey and not s77_main._bad;

-- Community

select s85_main.prikey, _upload_time, _user, deviceid, ST_X(gps) as longitude, ST_Y(gps) as latitude, project, department, province, district, association_name, official_address, city, box, region, phone_number, email, facebook, twitter, website, fax, date_of_creation, legal_registration, contact_name, phone_number_contact, email_contact, address_contact, city_contact, region_contact, numb_members, attendee_id, a_first_name, a_last_name, a_name, community_category,  signature from s85_main, s85_staff_community where s85_main.prikey = s85_staff_community.parkey and not s85_main._bad;


================ Monitoring

-- Attendees

select s99_attendee.prikey, s99_main._upload_time, s99_main._user, s99_main.deviceid, ST_X(gps) as longitude, ST_Y(gps) as latitude, project, department, province, district, typeactivity, dateactivity, manydays, official_address, city, box, region, topic, starttime, endtime, numbfaciliatator, attendee_id_1 a_first_name_1, a_last_name_1, a_name_1, organisation, position, signature, s73_person.firstname, lastname, middlename, relation_hh, date_birth, phone_number, sexe, marital, education_level, highest_grade, at_school, support, whosupport, school_attended, handicap, whathandicap, kids, working, income_source, income_source_other, employee, activity from s90_main, s90_attendees, s73_person  where s90_main.prikey = s90_attendees.parkey and s90_attendees.attendee_id_1 = s73_person.person_key and not s90_main._bad;

-- Unique Attendees view

create or replace view unique_attendees as select * from s99_attendee where prikey not in (select d1.prikey from s99_attendee d1, s99_attendee d2 where d1.attendee_id = d2.attendee_id and d1.prikey > d2.prikey)

-- Unique attendees of training

create or replace view training_attendees as select a.prikey, a.attendee_id, act.topic, act.date_activity from s99_attendee a, s99_main am, s97_main act  where a.parkey = am.prikey and am.activity = act._hrk and act.typeactivity = 'Training' and not a._bad and not am._bad and not act._bad;

create or replace view unique_training_attendees as select * from training_attendees where prikey not in (select d1.prikey from training_attendees d1, training_attendees d2 where d1.attendee_id = d2.attendee_id and d1.prikey > d2.prikey);


-- Non deleted records

create or replace view community_staff as select * from s85_staff_community where not _bad;
create or replace view community as select * from s85_main where not _bad;

create or replace view school_staff as select * from s77_staff where not _bad;
create or replace view school as select * from s77_main where not _bad;

############### Permissions

GRANT SELECT ON ALL TABLES IN SCHEMA public TO quicksight;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO quicksight;

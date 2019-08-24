-- 
-- Apply upgrade patches to survey definitions database
--

-- Clean up database
vacuum analyze;

-- Upgrade to 19.09+
alter table task_group add column complete_all boolean;
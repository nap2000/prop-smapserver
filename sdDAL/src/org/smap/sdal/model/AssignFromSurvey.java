package org.smap.sdal.model;

import java.util.ArrayList;

public class AssignFromSurvey {
	public String task_group_name;
	public int source_survey_id;
	public String project_name;
	public String source_survey_name;
	public String survey_name;
	public int user_id;
	public int target_survey_id;
	public int task_group_id;
	public boolean update_results;
	public boolean add_future;
	public boolean add_current;
	public NewTasks new_tasks;			// Set if tasks created on the client are to be set
	public ArrayList<TaskAddressSettings> address_columns;
	public SqlWhereClause filter;
}

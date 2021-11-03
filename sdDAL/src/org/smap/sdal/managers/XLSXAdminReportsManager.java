package org.smap.sdal.managers;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;

/*
This file is part of SMAP.

SMAP is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

SMAP is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with SMAP.  If not, see <http://www.gnu.org/licenses/>.

*/

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.ResourceBundle;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.smap.sdal.Utilities.ApplicationException;
import org.smap.sdal.Utilities.Authorise;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.XLSUtilities;
import org.smap.sdal.model.AR;


/*
 * Manage exporting of data posted from a data table
 */

public class XLSXAdminReportsManager {
	
	private static Logger log =
			 Logger.getLogger(XLSXAdminReportsManager.class.getName());
	
	Authorise a = null;
	Authorise aOrg = null;
	
	LogManager lm = new LogManager();		// Application log
	ResourceBundle localisation = null;
	boolean includeTemporaryUsers = false;
	
	public XLSXAdminReportsManager(ResourceBundle l) {
		localisation = l;
		
		ArrayList<String> authorisations = new ArrayList<String> ();	
		authorisations.add(Authorise.ADMIN);
		a = new Authorise(authorisations, null);
		
		ArrayList<String> authorisationsOrg = new ArrayList<String> ();	
		authorisationsOrg.add(Authorise.ORG);
		aOrg = new Authorise(authorisationsOrg, null);
	}

	/*
	 * Write new background report
	 */
	public String writeNewReport(Connection sd, String user, HashMap<String, String> params, String basePath) throws SQLException, IOException, ApplicationException {
		
		String filename = String.valueOf(UUID.randomUUID()) + ".kml";
	
		GeneralUtilityMethods.createDirectory(basePath + "/reports");
		String filepath = basePath + "/reports/" + filename;	// Use a random sequence to keep survey name unique
		File tempFile = new File(filepath);
		
		// Get params
		int oId = GeneralUtilityMethods.getKeyValueInt(BackgroundReportsManager.PARAM_O_ID, params);
		int month = GeneralUtilityMethods.getKeyValueInt(BackgroundReportsManager.PARAM_MONTH, params);	
		int year = GeneralUtilityMethods.getKeyValueInt(BackgroundReportsManager.PARAM_YEAR, params);	
		boolean bySurvey = GeneralUtilityMethods.getKeyValueBoolean(BackgroundReportsManager.PARAM_BY_SURVEY, params);	
		boolean byProject = GeneralUtilityMethods.getKeyValueBoolean(BackgroundReportsManager.PARAM_BY_PROJECT, params);
		boolean byDevice = GeneralUtilityMethods.getKeyValueBoolean(BackgroundReportsManager.PARAM_BY_DEVICE, params);
		includeTemporaryUsers = GeneralUtilityMethods.getKeyValueBoolean(BackgroundReportsManager.PARAM_INC_TEMP, params);
		
		// start validation			
		if(oId > 0) {
			aOrg.isAuthorised(sd, user);
		} else {
			a.isAuthorised(sd, user);
		}

		if(oId <= 0) {
			oId = GeneralUtilityMethods.getOrganisationId(sd, user);
		} 
					
		if(month < 1) {
			throw new ApplicationException(localisation.getString("ar_month_gt_0"));
		}
		// End Validation

		
		ArrayList<AR> report = null;
		if(bySurvey) {
			report = getAdminReportSurvey(sd, oId, month, year);
		} else if(byProject) {
			report = getAdminReportProject(sd, oId, month, year);
		} else if(byDevice) {
			report = getAdminReportDevice(sd, oId, month, year);
		} else {
			report = getAdminReport(sd, oId, month, year);
		}
		
		ArrayList<String> header = new ArrayList<String> ();
		header.add(localisation.getString("ar_ident"));
		header.add(localisation.getString("ar_user_name"));
		header.add(localisation.getString("ar_user_created"));
		if(byProject || bySurvey) {
			header.add(localisation.getString("ar_project_id"));
			header.add(localisation.getString("ar_project"));
		}
		if(bySurvey) {
			header.add(localisation.getString("ar_survey_id"));
			header.add(localisation.getString("ar_survey"));
		}
		if(byDevice) {
			header.add(localisation.getString("a_device"));
		}
		header.add(localisation.getString("ar_usage_month"));
		header.add(localisation.getString("ar_usage_at"));
		
		XLSXAdminReportsManager rm = new XLSXAdminReportsManager(localisation);
		rm.getNewReport(sd, tempFile, header, report, byProject, bySurvey, byDevice, year, month,
				GeneralUtilityMethods.getOrganisationName(sd, oId));

		

		
		return filename;
	
	}
	
	private ArrayList<AR> getAdminReport(Connection sd, int oId, int month, int year) throws SQLException {
		ArrayList<AR> rows = new ArrayList<AR> ();
		StringBuilder sql = new StringBuilder("select users.id as id,users.ident as ident, users.name as name, users.created as created, "
				+ "(select count (*) from upload_event ue, subscriber_event se "
					+ "where ue.ue_id = se.ue_id "
					+ "and se.status = 'success' "
					+ "and se.subscriber = 'results_db' "
					+ "and upload_time >=  ? "		// current month
					+ "and upload_time < ? "		// next month
					//+ "and extract(month from upload_time) = ? "
					//+ "and extract(year from upload_time) = ? "
					+ "and ue.user_name = users.ident) as month,"
				+ "(select count (*) from upload_event ue, subscriber_event se "
					+ "where ue.ue_id = se.ue_id and se.status = 'success' "
					+ "and se.subscriber = 'results_db' "
					+ "and ue.user_name = users.ident) as all_time "
				+ "from users "
				+ "where users.o_id = ? ");
		
		if(!includeTemporaryUsers) {
			sql.append("and not users.temporary ");
		}
		sql.append("order by users.ident");
		PreparedStatement pstmt = null;
		
		try {
			Timestamp t1 = GeneralUtilityMethods.getTimestampFromParts(year, month, 1);
			Timestamp t2 = GeneralUtilityMethods.getTimestampNextMonth(t1);
			
			pstmt = sd.prepareStatement(sql.toString());
			//pstmt.setInt(1, month);
			//pstmt.setInt(2, year);
			pstmt.setTimestamp(1, t1);
			pstmt.setTimestamp(2, t2);
			pstmt.setInt(3, oId);
			log.info("Admin report: " + pstmt.toString());
			ResultSet rs = pstmt.executeQuery();
			
			while(rs.next()) {
				AR ar = new AR();
				ar.userIdent = rs.getString("ident");
				ar.userName = rs.getString("name");
				ar.created = rs.getDate("created");
				ar.usageInPeriod = rs.getInt("month");
				ar.allTimeUsage = rs.getInt("all_time");
				rows.add(ar);
			}
			
		} finally {
			if(pstmt != null) {try{pstmt.close();}catch(Exception e) {}}
		}
		return rows;
	}
	
	private ArrayList<AR> getAdminReportProject(Connection sd, int oId, int month, int year) throws SQLException {
		
		ArrayList<AR> rows = new ArrayList<AR> ();
		HashMap<String, AR> monthMap = new HashMap<> ();
		
		StringBuilder sqlMonth = new StringBuilder("select count(*) as month, "
				+ "ue.user_name as ident, "
				+ "users.name as name, "
				+ "ue.p_id as p_id, "
				+ "project.name as project_name, "
				+ "users.created as created "
				+ "from users, subscriber_event se, upload_event ue "
				+ "left outer join project on project.id = ue.p_id "
				+ "where ue.ue_id = se.ue_id "
				+ "and se.status = 'success' "
				+ "and se.subscriber = 'results_db' "
				+ "and upload_time >=  ? "		// current month
				+ "and upload_time < ? "		// next month
				//+ "and extract(month from upload_time) = ? "
				//+ "and extract(year from upload_time) = ? "
				+ "and users.o_id = ? "
				+ "and users.ident = ue.user_name ");
		
		if(!includeTemporaryUsers) {
			sqlMonth.append("and not users.temporary ");
		}
		sqlMonth.append("group by ue.user_name, users.name, ue.p_id, project.name, users.created "
				+ "order by ue.user_name, ue.p_id;");
		PreparedStatement pstmtMonth = null;
		
		StringBuilder sqlAllTime = new StringBuilder("select count(*) as year, "
				+ "ue.user_name as ident, "
				+ "users.name as name, "
				+ "ue.p_id as p_id, "
				+ "project.name as project_name, "
				+ "users.created as created "
				+ "from users, subscriber_event se, upload_event ue "
				+ "left outer join project on project.id = ue.p_id "
				+ "where ue.ue_id = se.ue_id "
				+ "and se.status = 'success' "
				+ "and se.subscriber = 'results_db' "
				+ "and users.o_id = ? "
				+ "and users.ident = ue.user_name ");
		if(!includeTemporaryUsers) {
			sqlAllTime.append("and not users.temporary ");
		}
		sqlAllTime.append("group by ue.user_name, users.name, ue.p_id, project.name, users.created "
				+ "order by ue.user_name, ue.p_id");
		PreparedStatement pstmtAllTime = null;
		
		try {
			Timestamp t1 = GeneralUtilityMethods.getTimestampFromParts(year, month, 1);
			Timestamp t2 = GeneralUtilityMethods.getTimestampNextMonth(t1);
			
			pstmtMonth = sd.prepareStatement(sqlMonth.toString());
			//pstmtMonth.setInt(1, month);
			//pstmtMonth.setInt(2, year);
			pstmtMonth.setTimestamp(1, t1);
			pstmtMonth.setTimestamp(2, t2);
			pstmtMonth.setInt(3, oId);
			log.info("Monthly Admin report by project: " + pstmtMonth.toString());
			ResultSet rs = pstmtMonth.executeQuery();
			
			while(rs.next()) {
				AR ar = new AR();
				ar.userIdent = rs.getString("ident");
				ar.userName = rs.getString("name");
				ar.created = rs.getDate("created");
				ar.p_id = rs.getInt("p_id");
				ar.project = rs.getString("project_name");
				ar.usageInPeriod = rs.getInt("month");
				rows.add(ar);
				monthMap.put(ar.userIdent + "::::" + ar.p_id, ar);	// Save map so we can add all time values
			}
			
			// Get the all time
			pstmtAllTime = sd.prepareStatement(sqlAllTime.toString());
			pstmtAllTime.setInt(1, oId);
			log.info("All Time Admin report by project: " + pstmtAllTime.toString());
			rs = pstmtAllTime.executeQuery();
			while(rs.next()) {
						
				String user = rs.getString("ident");
				int p_id = rs.getInt("p_id");
				int allTime = rs.getInt("year");
				AR ar = monthMap.get(user + "::::" + p_id);
				if(ar == null) {
					ar = new AR();
					ar.userIdent = rs.getString("ident");
					ar.userName = rs.getString("name");
					ar.created = rs.getDate("created");
					ar.p_id = rs.getInt("p_id");
					ar.project = rs.getString("project_name");
					ar.usageInPeriod = 0;
					rows.add(ar);
				}
				ar.allTimeUsage = allTime;
				
			}
			
		} finally {
			if(pstmtMonth != null) {try{pstmtMonth.close();}catch(Exception e) {}}
			if(pstmtAllTime != null) {try{pstmtAllTime.close();}catch(Exception e) {}}
		}
		return rows;
	}

	private ArrayList<AR> getAdminReportSurvey(Connection sd, int oId, int month, int year) throws SQLException {
		
		ArrayList<AR> rows = new ArrayList<AR> ();
		HashMap<String, AR> monthMap = new HashMap<> ();
		
		StringBuilder sqlMonth = new StringBuilder("select count(*) as month, "
				+ "ue.user_name as ident, "
				+ "users.name as name, "
				+ "ue.p_id as p_id, "
				+ "ue.s_id as s_id, "
				+ "project.name as project_name, "
				+ "survey.display_name as survey_name, "
				+ "users.created as created "
				+ "from users, subscriber_event se, upload_event ue "
				+ "left outer join project on project.id = ue.p_id "
				+ "left outer join survey on survey.s_id = ue.s_id "
				+ "where ue.ue_id = se.ue_id "
				+ "and se.status = 'success' "
				+ "and se.subscriber = 'results_db' "
				+ "and upload_time >=  ? "		// current month
				+ "and upload_time < ? "		// next month
				//+ "and extract(month from upload_time) = ? "
				//+ "and extract(year from upload_time) = ? "
				+ "and users.o_id = ? "
				+ "and users.ident = ue.user_name ");
		if(!includeTemporaryUsers) {
			sqlMonth.append("and not users.temporary ");
		}
		sqlMonth.append("group by ue.user_name, users.name, ue.p_id, project.name, ue.s_id, survey.display_name, users.created "
				+ "order by ue.user_name, ue.p_id, ue.s_id");		
		PreparedStatement pstmtMonth = null;
		
		StringBuilder sqlAllTime = new StringBuilder("select count(*) as year, "
				+ "ue.user_name as ident, "
				+ "users.name as name, "
				+ "ue.p_id as p_id, "
				+ "ue.s_id as s_id, "
				+ "project.name as project_name, "
				+ "survey.display_name as survey_name, "
				+ "users.created as created "
				+ "from users, subscriber_event se, upload_event ue "
				+ "left outer join project on project.id = ue.p_id "
				+ "left outer join survey on survey.s_id = ue.s_id "
				+ "where ue.ue_id = se.ue_id "
				+ "and se.status = 'success' "
				+ "and se.subscriber = 'results_db' "
				+ "and users.o_id = ? "
				+ "and users.ident = ue.user_name ");
		if(!includeTemporaryUsers) {
			sqlAllTime.append("and not users.temporary ");
		}
		sqlAllTime.append("group by ue.user_name, users.name, ue.p_id, project.name, ue.s_id, survey.display_name, users.created "
				+ "order by ue.user_name, ue.p_id, ue.s_id");
		PreparedStatement pstmtAllTime = null;
		
		try {
			Timestamp t1 = GeneralUtilityMethods.getTimestampFromParts(year, month, 1);
			Timestamp t2 = GeneralUtilityMethods.getTimestampNextMonth(t1);
			
			pstmtMonth = sd.prepareStatement(sqlMonth.toString());
			//pstmtMonth.setInt(1, month);
			//pstmtMonth.setInt(2, year);
			pstmtMonth.setTimestamp(1, t1);
			pstmtMonth.setTimestamp(2, t2);
			pstmtMonth.setInt(3, oId);
			log.info("Monthly Admin report by survey: " + pstmtMonth.toString());
			ResultSet rs = pstmtMonth.executeQuery();
			
			while(rs.next()) {
				AR ar = new AR();
				ar.userIdent = rs.getString("ident");
				ar.userName = rs.getString("name");
				ar.created = rs.getDate("created");
				ar.p_id = rs.getInt("p_id");
				ar.project = rs.getString("project_name");
				ar.s_id = rs.getInt("s_id");
				ar.survey = rs.getString("survey_name");
				ar.usageInPeriod = rs.getInt("month");
				rows.add(ar);
				monthMap.put(ar.userIdent + "::::" + ar.p_id + "::::" + ar.s_id, ar);	// Save map so we can add all time values
			}
			
			// Get the all time
			pstmtAllTime = sd.prepareStatement(sqlAllTime.toString());
			pstmtAllTime.setInt(1, oId);
			log.info("All Time Admin report by project: " + pstmtAllTime.toString());
			rs = pstmtAllTime.executeQuery();
			while(rs.next()) {
						
				String user = rs.getString("ident");
				int p_id = rs.getInt("p_id");
				int s_id = rs.getInt("s_id");
				int allTime = rs.getInt("year");
				AR ar = monthMap.get(user + "::::" + p_id + "::::" + s_id);
				if(ar == null) {
					ar = new AR();
					ar.userIdent = rs.getString("ident");
					ar.userName = rs.getString("name");
					ar.created = rs.getDate("created");
					ar.p_id = rs.getInt("p_id");
					ar.project = rs.getString("project_name");
					ar.s_id = rs.getInt("s_id");
					ar.survey = rs.getString("survey_name");
					ar.usageInPeriod = 0;
					rows.add(ar);
				}
				ar.allTimeUsage = allTime;
				
			}
			
		} finally {
			if(pstmtMonth != null) {try{pstmtMonth.close();}catch(Exception e) {}}
			if(pstmtAllTime != null) {try{pstmtAllTime.close();}catch(Exception e) {}}
		}
		return rows;
	}
	
	private ArrayList<AR> getAdminReportDevice(Connection sd, int oId, int month, int year) throws SQLException {
		
		ArrayList<AR> rows = new ArrayList<AR> ();
		HashMap<String, AR> monthMap = new HashMap<> ();
		
		StringBuilder sqlMonth = new StringBuilder("select count(*) as month, "
				+ "ue.user_name as ident, "
				+ "users.name as name, "
				+ "ue.imei as imei, "
				+ "users.created as created "
				+ "from users, subscriber_event se, upload_event ue "
				+ "where ue.ue_id = se.ue_id "
				+ "and se.status = 'success' "
				+ "and se.subscriber = 'results_db' "
				//+ "and extract(month from upload_time) = ? "
				//+ "and extract(year from upload_time) = ? "
				+ "and upload_time >=  ? "		// current month
				+ "and upload_time < ? "		// next month
				+ "and users.o_id = ? "
				+ "and users.ident = ue.user_name ");
		if(!includeTemporaryUsers) {
			sqlMonth.append("and not users.temporary ");
		}
		sqlMonth.append("group by ue.user_name, users.name, ue.imei, users.created "
				+ "order by ue.user_name, ue.imei");		
		PreparedStatement pstmtMonth = null;
		
		StringBuilder sqlAllTime = new StringBuilder("select count(*) as year, "
				+ "ue.user_name as ident, "
				+ "users.name as name, "
				+ "ue.imei as imei, "
				+ "users.created as created "
				+ "from users, subscriber_event se, upload_event ue "
				+ "left outer join project on project.id = ue.p_id "
				+ "left outer join survey on survey.s_id = ue.s_id "
				+ "where ue.ue_id = se.ue_id "
				+ "and se.status = 'success' "
				+ "and se.subscriber = 'results_db' "
				+ "and users.o_id = ? "
				+ "and users.ident = ue.user_name ");
		if(!includeTemporaryUsers) {
			sqlAllTime.append("and not users.temporary ");
		}
		sqlAllTime.append("group by ue.user_name, users.name, ue.imei, users.created "
				+ "order by ue.user_name, ue.imei");	
		PreparedStatement pstmtAllTime = null;
		
		try {
			Timestamp t1 = GeneralUtilityMethods.getTimestampFromParts(year, month, 1);
			Timestamp t2 = GeneralUtilityMethods.getTimestampNextMonth(t1);
			
			pstmtMonth = sd.prepareStatement(sqlMonth.toString());
			//pstmtMonth.setInt(1, month);
			//pstmtMonth.setInt(2, year);
			pstmtMonth.setTimestamp(1, t1);
			pstmtMonth.setTimestamp(2, t2);
			pstmtMonth.setInt(3, oId);
			log.info("Monthly Admin report by device: " + pstmtMonth.toString());
			ResultSet rs = pstmtMonth.executeQuery();
			
			while(rs.next()) {
				AR ar = new AR();
				ar.userIdent = rs.getString("ident");
				ar.userName = rs.getString("name");
				ar.created = rs.getDate("created");
				ar.device = rs.getString("imei");
				ar.usageInPeriod = rs.getInt("month");
				rows.add(ar);
				monthMap.put(ar.userIdent + "::::" + ar.device, ar);	// Save map so we can add all time values
			}
			
			// Get the all time
			pstmtAllTime = sd.prepareStatement(sqlAllTime.toString());
			pstmtAllTime.setInt(1, oId);
			log.info("All Time Admin report by project: " + pstmtAllTime.toString());
			rs = pstmtAllTime.executeQuery();
			while(rs.next()) {
						
				String user = rs.getString("ident");
				String device = rs.getString("imei");
				int allTime = rs.getInt("year");
				AR ar = monthMap.get(user + "::::" + device);
				if(ar == null) {
					ar = new AR();
					ar.userIdent = rs.getString("ident");
					ar.userName = rs.getString("name");
					ar.created = rs.getDate("created");
					ar.device = rs.getString("imei");
					ar.usageInPeriod = 0;
					rows.add(ar);
				}
				ar.allTimeUsage = allTime;
				
			}
			
		} finally {
			if(pstmtMonth != null) {try{pstmtMonth.close();}catch(Exception e) {}}
			if(pstmtAllTime != null) {try{pstmtAllTime.close();}catch(Exception e) {}}
		}
		return rows;
	}
	
	/*
	 * Create the new style XLSX report
	 */
	public void getNewReport(
			Connection sd,
			File tempFile,
			ArrayList<String> header,
			ArrayList <AR> report,
			boolean byProject,
			boolean bySurvey,
			boolean byDevice,
			int year,
			int month,
			String orgName) throws ApplicationException, FileNotFoundException {

		FileOutputStream outputStream = new FileOutputStream(tempFile);
		
		if(header != null) {

			Workbook wb = null;
			int rowNumber = 0;
			Sheet dataSheet = null;
			CellStyle errorStyle = null;

			try {	
				
				/*
				 * Create XLSX File
				 */
				wb = new SXSSFWorkbook(10);		// Serialised output
				dataSheet = wb.createSheet("data");
				rowNumber = 0;
				
				Map<String, CellStyle> styles = XLSUtilities.createStyles(wb);
				CellStyle headerStyle = styles.get("header");
				errorStyle = styles.get("error");
				
				/*
				 * Write the headers
				 */	
				Row yearRow = dataSheet.createRow(rowNumber++);		
				Cell cell = yearRow.createCell(0);	// Year
				cell.setCellValue(localisation.getString("bill_year"));
				cell = yearRow.createCell(1);	
				cell.setCellValue(year);
				
				Row monthRow = dataSheet.createRow(rowNumber++);		
				cell = monthRow.createCell(0);	// Month
				cell.setCellValue(localisation.getString("bill_month"));
				cell = monthRow.createCell(1);	
				cell.setCellValue(month);
				
				Row orgRow = dataSheet.createRow(rowNumber++);		
				cell = orgRow.createCell(0);
				cell.setCellValue(localisation.getString("bill_org"));
				cell = orgRow.createCell(1);	
				cell.setCellValue(orgName);
				
				rowNumber++;		// blank row
				Row headerRow = dataSheet.createRow(rowNumber++);				
				int colNumber = 0;
				while(colNumber < header.size()) {
					cell = headerRow.createCell(colNumber);
					cell.setCellStyle(headerStyle);
					cell.setCellValue(header.get(colNumber));
					colNumber++;
				}
				
				int monthlyCol = 0;
				int allTimeCol = 0;
				int firstDataRow = rowNumber + 1;
				for(AR ar : report) {
					if(ar.usageInPeriod > 0 || ar.allTimeUsage > 0) {
						colNumber = 0;
						Row row = dataSheet.createRow(rowNumber++);	
						cell = row.createCell(colNumber++);	// ident
						cell.setCellValue(ar.userIdent);
						
						cell = row.createCell(colNumber++);	// Name
						cell.setCellValue(ar.userName);
						
						cell = row.createCell(colNumber++);	// User created
						if(ar.created != null) {
							cell.setCellStyle(styles.get("date"));
							cell.setCellValue(ar.created);
						}
						
						if(byProject || bySurvey) {
							cell = row.createCell(colNumber++);	// Project
							cell.setCellValue(ar.p_id);
							
							cell = row.createCell(colNumber++);
							cell.setCellValue(ar.project);
						}
						
						if(bySurvey) {
							cell = row.createCell(colNumber++);	// Survey
							cell.setCellValue(ar.s_id);
							
							cell = row.createCell(colNumber++);	
							cell.setCellValue(ar.survey);
						}
						
						if(byDevice) {
							cell = row.createCell(colNumber++);	// Device
							cell.setCellValue(ar.device);
							
						}
						
						monthlyCol = colNumber;
						cell = row.createCell(colNumber++);	// Monthly Usage
						cell.setCellValue(ar.usageInPeriod);
						
						allTimeCol = colNumber;
						cell = row.createCell(colNumber++);	// All time Usage
						cell.setCellValue(ar.allTimeUsage);
					}
				}
				
				// Add totals
				Row row = dataSheet.createRow(rowNumber++);	
				
				// Monthly
				cell = row.createCell(monthlyCol);
				String colAlpha = getColAlpha(monthlyCol);
				String formula= "SUM(" + colAlpha + firstDataRow + ":" + colAlpha + (rowNumber - 1) + ")";
				cell.setCellStyle(styles.get("bold"));
				cell.setCellFormula(formula);
				
				// All time
				cell = row.createCell(allTimeCol);
				colAlpha = getColAlpha(allTimeCol);
				formula = "SUM(" + colAlpha + firstDataRow + ":" + colAlpha + (rowNumber - 1) + ")";
				cell.setCellStyle(styles.get("bold"));
				cell.setCellFormula(formula);

			} catch (Exception e) {
				log.log(Level.SEVERE, "Error", e);
				
				String msg = e.getMessage();
				if(msg.contains("does not exist")) {
					msg = localisation.getString("msg_no_data");
				}
				Row dataRow = dataSheet.createRow(rowNumber + 1);	
				Cell cell = dataRow.createCell(0);
				cell.setCellStyle(errorStyle);
				cell.setCellValue(msg);
				
				throw new ApplicationException("Error: " + e.getMessage());
			} finally {	

				try {
					wb.write(outputStream);
					wb.close();

					((SXSSFWorkbook) wb).dispose();		// Dispose of temporary files
				} catch (Exception ex) {
					log.log(Level.SEVERE, "Error", ex);
				}


			}
		}

		return;
	}
	
	private String getColAlpha(int col) {
		return "ABCDEFGHIJKLMNOPQRSTUVQXYZ".substring(col, col + 1);
	}

}
